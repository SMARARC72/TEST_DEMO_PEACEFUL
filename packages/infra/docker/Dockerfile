# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/
RUN cd packages/shared && npm ci
RUN cd packages/api && npm ci
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/
RUN cd packages/api && npx prisma generate
RUN cd packages/api && npm run build

# Production stage
FROM node:22-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package*.json ./
COPY --from=builder /app/packages/api/prisma ./prisma
COPY --from=builder /app/packages/api/node_modules ./node_modules
RUN addgroup -g 1001 -S nodejs && adduser -S peacefull -u 1001
USER peacefull
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -q --spider http://localhost:3001/health || exit 1
CMD ["dumb-init", "node", "dist/server.js"]
