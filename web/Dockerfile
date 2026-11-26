# Build context: raiz do repositório (precisa de db/migrations).
# Easypanel: defina "Build path" = / e "Dockerfile path" = web/Dockerfile
# Compila o agente Windows (cross-compile no Linux) para ser servido em /api/download/agent
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS agent
WORKDIR /src
COPY agent/Foccus.Agent ./Foccus.Agent
RUN dotnet publish Foccus.Agent -c Release -r win-x64 --self-contained true \
    -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:EnableCompressionInSingleFile=true -o /out

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
COPY --from=agent /out/Foccus.exe ./agent/Foccus.exe
EXPOSE 3000
CMD ["node", "scripts/start.mjs"]
