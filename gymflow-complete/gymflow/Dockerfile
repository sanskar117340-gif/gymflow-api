# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./

# ─── Development ──────────────────────────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5000
CMD ["dumb-init", "npm", "run", "dev"]

# ─── Build / Install prod deps ────────────────────────────────────────────────
FROM base AS deps
RUN npm ci --only=production

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S gymflow -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=gymflow:nodejs . .
USER gymflow
EXPOSE 5000
ENV NODE_ENV=production
CMD ["dumb-init", "node", "server.js"]
