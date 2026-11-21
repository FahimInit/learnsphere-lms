FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY tsconfig.base.json ./
COPY server/package.json ./server/

RUN npm install --workspace=@learnsphere/server

COPY server ./server
RUN npm --workspace=@learnsphere/server run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY server/package.json ./server/
RUN npm install --omit=dev --workspace=@learnsphere/server

COPY --from=builder /app/server/dist ./server/dist
RUN mkdir -p /app/uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

CMD ["node", "server/dist/server.js"]
