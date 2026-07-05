FROM node:20-alpine
WORKDIR /app

# Cache bust: 1783288741
ARG CACHEBUST=1783288741

COPY . .

RUN npm install --legacy-peer-deps

# Verify registry-client import is gone from config.ts
RUN grep -q 'registry-client' src/config.ts && echo 'ERROR: still importing registry-client' && exit 1 || echo 'OK: config.ts is clean'

RUN npm run build

RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]