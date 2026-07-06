# Multi-stage production build for mauknh.diaries

# --- Client build ---
FROM node:20-alpine AS client-build
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install --workspace=client --include-workspace-root
COPY client/ ./client/
ARG VITE_API_URL=
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build -w client

# --- Server build ---
FROM node:20-alpine AS server-build
WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/
RUN npm install --workspace=server --include-workspace-root --omit=dev
COPY server/ ./server/
RUN npm run build -w server

# --- Production image ---
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache tini

COPY package.json ./
COPY server/package.json ./server/
RUN npm install --workspace=server --include-workspace-root --omit=dev

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client/dist ./client/dist
COPY server/ecosystem.config.cjs ./server/

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
