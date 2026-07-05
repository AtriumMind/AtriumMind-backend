# ── Build ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── Production ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

# Non-root user
RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
