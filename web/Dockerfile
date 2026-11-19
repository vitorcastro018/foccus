# Build context: raiz do repositório (precisa de db/migrations).
# Easypanel: defina "Build path" = / e "Dockerfile path" = web/Dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 MIGRATIONS_DIR=/app/db/migrations
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/scripts ./scripts
COPY db/migrations ./db/migrations
EXPOSE 3000
CMD ["node", "scripts/start.mjs"]
