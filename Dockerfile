FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps
RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]