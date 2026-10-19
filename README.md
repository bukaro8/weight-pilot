# WeightPilot

WeightPilot is a bilingual Next.js application for a private, personalised weight-management information and guidance platform. It is not a clinic, healthcare provider or medical service. Phase 3B adds invitation-only registration, referral tracking and secure account reactivation; assessments and other business workflows remain placeholders.

## Local development

Requirements: Node.js 22+, npm, and PostgreSQL when working on database-backed features.

```bash
cp .env.example .env.local
npm ci
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Quality checks are available through:

```bash
npm run lint
npm run typecheck
npm run build
```

## Docker deployment

The production image uses Next.js standalone output and runs as an unprivileged user. PostgreSQL is reachable only over the internal Compose database network and has no published host port.

1. Create the deployment environment file:

   ```bash
   cp .env.example .env
   ```

2. Replace every placeholder secret. `DATABASE_URL` must use `db` as its host and must match the PostgreSQL user, password, and database values. Generate `BETTER_AUTH_SECRET` from at least 32 cryptographically random bytes. Set `BETTER_AUTH_URL` to the public HTTPS origin exposed by your tunnel or reverse proxy, and configure Resend with a verified `EMAIL_FROM` sender.

3. Build the images and start PostgreSQL:

   ```bash
   docker compose build
   docker compose up -d db
   ```

4. Apply database migrations explicitly:

   ```bash
   docker compose run --rm migrate
   ```

5. Start the application:

   ```bash
   docker compose up -d app
   docker compose ps
   ```

The application defaults to `http://127.0.0.1:3000`. Migrations are deliberately not run during application startup, so a failed migration cannot place the web container in a restart loop.

### Initial administrator

WeightPilot permits exactly one administrator. The database enforces this with a partial unique index, public registration is disabled, and there is no administrator registration endpoint. Run migrations first, then create a temporary file named `.env.admin` (it is ignored by Git) containing:

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=WeightPilot Administrator
ADMIN_PASSWORD=a-long-unique-passphrase
ADMIN_PREFERRED_LANGUAGE=en
```

Load it only for the one-time bootstrap, then securely delete it:

```bash
set -a
. ./.env.admin
set +a
docker compose --profile tools run --rm bootstrap-admin
unset ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD ADMIN_PREFERRED_LANGUAGE
```

The command fails without changing data if an administrator or the requested email already exists. The administrator is created unverified; start the application and attempt to sign in once to receive the mandatory verification email. After verification, sign in normally. Never store the administrator password in the long-lived deployment `.env`, shell history, source control or Compose files.

For a non-Docker local PostgreSQL deployment, load the same temporary variables alongside `DATABASE_URL` and run `npm run auth:bootstrap-admin`.

### Invitations and registration

Public Better Auth sign-up remains disabled. An active, verified member generates a single-use invitation from **Invitations** and shares its code or link. Each invitation expires after seven days and may be revoked until it is used. Redeeming an invitation creates a `USER` account and sends the mandatory email-verification message; invitations never grant administrator access.

An inactive member uses **Reactivate account** with a new invitation and their existing credentials. WeightPilot restores the original account, preserves its history, and revokes prior sessions. No separate administrator approval is required.

Invitation redemption is transactionally locked in PostgreSQL. Applying the committed migration is therefore required before enabling Phase 3B:

```bash
docker compose run --rm migrate
```

The invitation copy stored for its creator is encrypted with `BETTER_AUTH_SECRET`; keep that secret stable and backed up securely. Rotating it invalidates display/copy access to previously created active codes, although their one-way hashes and redemption records remain intact.

### Cloudflare Tunnel or an existing reverse proxy

No proxy is bundled. For a host-installed Cloudflare Tunnel or reverse proxy, send traffic to `http://127.0.0.1:3000`. Keep `APP_BIND_ADDRESS=127.0.0.1` so the application is not exposed directly on every host interface.

A containerised tunnel or proxy can instead join the existing `weightpilot_web` Docker network and use `http://app:3000` as its upstream. Preserve the original `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers, terminate TLS at the existing proxy, and keep `BETTER_AUTH_URL` set to the external HTTPS URL.

Set `AUTH_TRUST_PROXY_HEADERS=true` only when clients cannot reach the application origin directly and the trusted proxy overwrites `CF-Connecting-IP` or `X-Real-IP`. Otherwise leave it `false`. Add any legitimate additional browser origins to the comma-separated `BETTER_AUTH_TRUSTED_ORIGINS`; do not use broad wildcards.

### Authentication email delivery

Email verification and password reset use Resend. Set `RESEND_API_KEY` and a verified `EMAIL_FROM` sender in the runtime environment. Builds and containers can start without these values, but authentication emails will not be delivered until they are configured. Email copy follows each account's `preferred_language` (`en` or `es`). Password-recovery responses intentionally do not reveal whether an email address exists.

Sessions are stored in PostgreSQL for seven days, refreshed daily, revoked after a password reset, and issued in secure, HTTP-only cookies in production. Private routes re-check the user record server-side, so inactive or unverified accounts are denied even if an older session cookie still exists.

### Updating

Create a database backup first, then fetch the new source and run:

```bash
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
docker image prune -f
```

Review `docker compose ps` and `docker compose logs --tail=100 app` after the update. Roll back by checking out the previous application revision and rebuilding; restore the database only when the migration is not backward-compatible.

## Database migrations

Generate migration files after an intentional schema change:

```bash
npm run db:generate
```

Commit the generated `drizzle/` files. Apply committed migrations independently of application startup with:

```bash
docker compose run --rm migrate
```

## Database backup and restore

Create a local backup directory and write a compressed PostgreSQL archive:

```bash
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/weightpilot-$(date +%Y%m%d-%H%M%S).dump"
```

Check that the resulting file is non-empty and copy it to secure storage outside the Docker host.

Restoring replaces the current database. Stop the application first and choose the backup path explicitly:

```bash
docker compose stop app
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --exit-on-error' < backups/weightpilot-YYYYMMDD-HHMMSS.dump
docker compose run --rm migrate
docker compose up -d app
```

Test the restore procedure periodically on a separate environment. The named volume is `weightpilot_postgres_data`; never treat the volume alone as a substitute for off-host backups.
