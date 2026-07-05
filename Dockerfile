FROM node:20-alpine
WORKDIR /app

# Build 1783291600
COPY . .

# Step 1: Install all deps (postinstall will symlink registry-client)
RUN npm install --legacy-peer-deps

# Step 2: Build registry-client TypeScript to JavaScript
RUN cd packages/registry-client && \
    npx tsc --outDir dist --module NodeNext --moduleResolution NodeNext \
    --target ES2022 --declaration --skipLibCheck --esModuleInterop \
    src/index.ts src/networks.ts src/validateNetwork.ts 2>&1 || \
    npx tsc --outDir dist --module CommonJS --target ES2022 \
    --declaration --skipLibCheck src/index.ts src/networks.ts src/validateNetwork.ts 2>&1 || \
    echo 'registry-client build attempted'

# Step 3: Verify registry-client dist exists
RUN ls packages/registry-client/dist/ && echo 'registry-client compiled OK'

# Step 4: Re-run postinstall to ensure symlink is fresh with new dist
RUN node -e "const fs=require('fs'); \
  fs.mkdirSync('node_modules/@atriumind',{recursive:true}); \
  try{fs.unlinkSync('node_modules/@atriumind/registry-client')}catch(e){}; \
  fs.symlinkSync(process.cwd()+'/packages/registry-client','node_modules/@atriumind/registry-client'); \
  console.log('Symlinked registry-client')"

# Step 5: Build main app
RUN rm -rf dist && npm run build

RUN addgroup -S atrium && adduser -S atrium -G atrium
USER atrium
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]