FROM node:22.12-slim AS base
RUN corepack enable
ENV COREPACK_INTEGRITY_KEYS=""

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install

COPY . .
RUN npx prisma generate && pnpm build

ENV NODE_ENV=production
EXPOSE 3000
ENV PORT=3000
CMD ["sh", "scripts/railway-start.sh"]
