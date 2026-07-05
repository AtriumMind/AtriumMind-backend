FROM node:20-alpine
WORKDIR /app

# ALL registry-client imports fixed: 1783291130
# config.ts - inlined
# registrationGuidance.ts - inlined  
# registryClient.ts - relative path to packages/

COPY . .
RUN npm install --legacy-peer-deps
RUN rm -rf dist && npm run build
RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]