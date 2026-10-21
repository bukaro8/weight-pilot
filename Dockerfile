# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# One-off tooling target, invoked explicitly by the Compose migrate service.
FROM base AS migrations
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src/db ./src/db
USER node
CMD ["npm", "run", "db:migrate"]

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Include only migration runtime packages, not the development toolchain.
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --chown=nextjs:nodejs drizzle/*.sql ./drizzle/
COPY --chown=nextjs:nodejs drizzle/meta/_journal.json ./drizzle/meta/_journal.json
COPY --chown=nextjs:nodejs scripts/db-migrate-safe.mjs scripts/migration-safety.mjs scripts/start-production.sh ./scripts/

USER nextjs
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/start-production.sh"]
CMD ["node", "server.js"]
