# Production build for mauknh.diaries

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.server.json ./
COPY public ./public
COPY src ./src

ARG VITE_API_URL=
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache tini

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist ./dist
COPY ecosystem.config.cjs ./

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist-server/index.js"]
