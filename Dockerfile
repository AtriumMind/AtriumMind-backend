FROM node:22-alpine
WORKDIR /app

# Node 22 has native WebSocket — fixes supabase-js realtime error: 1783293364
COPY . .
RUN npm install --legacy-peer-deps
RUN mkdir -p node_modules/@atriumind && \
    rm -rf node_modules/@atriumind/registry-client && \
    cp -r packages/registry-client node_modules/@atriumind/registry-client && \
    echo 'registry-client linked OK'
RUN rm -rf dist && npm run build
RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]