# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY packages/shared/package*.json ./packages/shared/
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && npm ci && npm run build
RUN cd packages/api && npm ci
COPY packages/api/ ./packages/api/
RUN cd packages/api && npx prisma generate
RUN cd packages/api && npm run build

# Production stage
FROM node:22-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production
# Copy the shared package (built) so @peacefull/shared resolves at runtime
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
# Copy the API
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package*.json ./packages/api/
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
# Overwrite @peacefull/shared in node_modules with the compiled version + its deps
COPY --from=builder /app/packages/shared/dist ./packages/api/node_modules/@peacefull/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/api/node_modules/@peacefull/shared/package.json
COPY --from=builder /app/packages/shared/node_modules ./packages/api/node_modules/@peacefull/shared/node_modules
WORKDIR /app/packages/api
RUN addgroup -g 1001 -S nodejs && adduser -S peacefull -u 1001
USER peacefull
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -q --spider http://localhost:3001/health || exit 1
CMD ["dumb-init", "node", "dist/server.js"]
