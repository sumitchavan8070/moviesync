# Production build for mauknh.diaries (Next.js + custom server)

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY next.config.ts postcss.config.mjs tsconfig.json tsconfig.server.json next-env.d.ts ./
COPY app ./app
COPY public ./public
COPY src ./src
COPY server.ts ./

ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_WS_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache tini

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/.next ./.next
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/public ./public
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/src/server ./src/server
COPY ecosystem.config.cjs ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "server.ts"]
