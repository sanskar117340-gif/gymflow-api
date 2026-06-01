const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Subscription, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const PRICE_MAP = {
  pro_monthly:   process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_yearly:    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  elite_monthly: process.env.STRIPE_ELITE_MONTHLY_PRICE_ID,
  elite_yearly:  process.env.STRIPE_ELITE_YEARLY_PRICE_ID,
};

// GET /subscriptions — current subscription
router.get('/', authenticate, async (req, res) => {
  const sub = await Subscription.findOne({ where: { user_id: req.user.id } });
  res.json({ subscription: sub });
});

// POST /subscriptions/checkout — create Stripe checkout session
router.post('/checkout', authenticate, async (req, res) => {
  const { tier, interval } = req.body;
  const priceKey = `${tier}_${interval}`;
  const priceId = PRICE_MAP[priceKey];
  if (!priceId) throw createError('Invalid plan selection', 400);

  let customerId = req.user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: `${req.user.first_name} ${req.user.last_name}`,
      metadata: { user_id: req.user.id },
    });
    customerId = customer.id;
    await req.user.update({ stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    metadata: { user_id: req.user.id, tier, interval },
  });

  res.json({ url: session.url });
});

// POST /subscriptions/portal — Stripe billing portal
router.post('/portal', authenticate, async (req, res) => {
  if (!req.user.stripe_customer_id) throw createError('No billing account found', 400);
  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL}/settings/billing`,
  });
  res.json({ url: session.url });
});

// POST /subscriptions/webhook — Stripe webhook
router.post('/webhook', express_raw_body, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, tier } = session.metadata;
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
        await Subscription.upsert({
          user_id,
          stripe_subscription_id: stripeSubscription.id,
          stripe_price_id: stripeSubscription.items.data[0].price.id,
          tier,
          billing_interval: stripeSubscription.items.data[0].price.recurring.interval === 'month' ? 'monthly' : 'yearly',
          status: 'active',
          current_period_start: new Date(stripeSubscription.current_period_start * 1000),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        });
        await User.update({ subscription_tier: tier }, { where: { id: user_id } });
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await Subscription.update({
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000),
          current_period_end: new Date(sub.current_period_end * 1000),
          cancel_at_period_end: sub.cancel_at_period_end,
        }, { where: { stripe_subscription_id: sub.id } });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const dbSub = await Subscription.findOne({ where: { stripe_subscription_id: sub.id } });
        if (dbSub) {
          await dbSub.update({ status: 'canceled', tier: 'free' });
          await User.update({ subscription_tier: 'free' }, { where: { id: dbSub.user_id } });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Middleware to parse raw body for Stripe webhooks
function express_raw_body(req, res, next) {
  if (req.headers['stripe-signature']) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { req.body = data; next(); });
  } else {
    next();
  }
}

module.exports = router;
