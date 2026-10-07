FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY server ./server
COPY data/menu.seed.json ./data/menu.seed.json
COPY data/reservations-plan.json ./data/reservations-plan.json
RUN npm test && npm run build

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data BOOTSTRAP_DIR=/app/data/bootstrap
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY data/menu.seed.json ./data/menu.seed.json
COPY data/reservations-plan.json ./data/reservations-plan.json
COPY data/bootstrap ./data/bootstrap
EXPOSE 8080
CMD ["node", "server/index.mjs"]
