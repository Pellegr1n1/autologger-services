FROM node:20-alpine AS builder

WORKDIR /app

ENV NPM_CONFIG_OPTIONAL=false

COPY package*.json .npmrc ./

RUN npm ci --omit=optional --ignore-scripts && \
    npm cache clean --force

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NPM_CONFIG_OPTIONAL=false \
    NODE_ENV=production

RUN apk add --no-cache dumb-init

COPY package*.json .npmrc ./

RUN npm ci --omit=dev --omit=optional --ignore-scripts && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p storage/uploads logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]