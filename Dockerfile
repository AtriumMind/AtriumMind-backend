FROM node:20-alpine
WORKDIR /app

# Force full rebuild: 1783290689
COPY package.json ./
COPY packages ./packages
COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json tsconfig.build.json ./

# Install deps
RUN npm install --legacy-peer-deps

# Clean any stale compiled output then build fresh
RUN rm -rf dist && npm run build

# Verify registry-client import is NOT in compiled output
RUN node -e "const fs=require('fs'); const c=fs.readFileSync('dist/config.js','utf8'); if(c.includes('@atriumind/registry-client')){console.error('FAIL: old import found');process.exit(1)} else console.log('OK: dist/config.js is clean')"

RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]