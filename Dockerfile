FROM node:20-alpine
WORKDIR /app

# Force fresh build: 1783288770
COPY . .

RUN npm install --legacy-peer-deps

RUN npm run build

RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]