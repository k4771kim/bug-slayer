FROM node:20-slim AS base
RUN npm i -g pnpm@9

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/game-engine/package.json ./packages/game-engine/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY . .
RUN pnpm --filter @bug-slayer/shared build
RUN pnpm --filter @bug-slayer/server build
RUN cd apps/server && npx prisma generate

# Production
FROM node:20-slim AS runner
WORKDIR /app
RUN npm i -g pnpm@9

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
