# WeightPilot

WeightPilot is a bilingual Next.js application for a private, personalised weight-management information and guidance platform. It is not a clinic, healthcare provider or medical service. The application includes invitation-only accounts, a short personalised-assessment questionnaire, administrator-managed illustrative reference pricing, preliminary educational information, private messaging and administrator-reviewed guidance reports.

## Local development

Requirements: Node.js 22+, npm, and PostgreSQL when working on database-backed features.

```bash
cp .env.example .env.local
npm ci
npm run db:migrate
npm run db:seed:pricing
npm run dev
```

Open `http://localhost:3000`. Quality checks are available through:

```bash
npm run lint
npm run typecheck
npm run build
```

## Coolify production deployment (Dockerfile)

The existing Coolify application uses the final `runner` stage of the Dockerfile and the separate PostgreSQL resource. Keep the existing runtime `DATABASE_URL` and network unchanged. No new environment variables, resource, SSH command or migration job are required.

1. Back up the PostgreSQL resource using your existing backup procedure.
2. Push this revision and click **Deploy** in the existing Coolify application. Use the Dockerfile's default entrypoint/command (remove any custom override that bypasses it). Do not select the optional `migrations` build target.
3. Check application logs for `Database migrations complete: N applied.`, followed by Next.js readiness. Allow startup/health-check time for migrations; the HTTP server does not listen before completion.

Every container start, including redeploys and restarts, runs `scripts/start-production.sh`. It runs `npm run db:migrate`'s underlying script, then replaces the shell with the standalone Next.js server. Already-applied migrations are skipped using the existing Drizzle journal. If production has 0000–0010 recorded, migration 0011 will run on the next deployment, once.

Failures exit non-zero and **never start Next.js**. Database errors are redacted to avoid exposing SQL values or credentials. The legacy populated-`profiles` preflight still blocks unsafe historical migration 0001. Investigate connectivity, database permissions, pending SQL and lock contention before retrying; never clear the journal or use schema push to bypass a failure. A restart policy may retry a failed container; it will remain unavailable until the cause is fixed.

The same transaction holds a PostgreSQL advisory lock through preflight, migration execution and journal updates. Competing new containers wait, then re-check the journal. Lock waits are bounded at 120 seconds; each SQL statement at 10 minutes. The database user needs schema/table migration privileges, as it did for manual migrations. Use the existing direct PostgreSQL connection, not a statement-pooling proxy.

Keep migrations transactional and backwards-compatible with the previous application during rolling deployment. This lock does not protect old, already-running application code from incompatible schema changes, nor serialize external tools that ignore the lock. Review destructive migrations and use expand/contract releases. A code rollback does not undo schema changes. Long-running migrations may need a planned maintenance window and adjusted deployment health-check deadlines.

Administrator bootstrap remains a separate, explicit operation. Startup never creates accounts, runs bootstrap, or reads administrator credentials. The runtime image contains no bootstrap script or administrator credentials.

## Local Docker Compose deployment

The production image uses Next.js standalone output and runs as an unprivileged user. PostgreSQL is reachable only over the internal Compose database network and has no published host port.

1. Create the deployment environment file:

   ```bash
   cp .env.example .env
   ```

2. Replace every placeholder secret. `DATABASE_URL` must use `db` as its host and must match the PostgreSQL user, password, and database values. Generate `BETTER_AUTH_SECRET` from at least 32 cryptographically random bytes. For production set both `BETTER_AUTH_URL=https://weightpilot.uk` and `PUBLIC_APP_URL=https://weightpilot.uk`; keep local development on `http://localhost:3000` with a blank `PUBLIC_APP_URL`. Configure Resend with a verified `EMAIL_FROM` sender.

3. Build the images and start PostgreSQL:

   ```bash
   docker compose build
   docker compose up -d db
   ```

4. Apply database migrations explicitly:

   ```bash
   docker compose run --rm migrate
   ```

5. Seed any missing reference prices. The command is idempotent and preserves administrator edits:

   ```bash
   docker compose run --rm seed-pricing
   ```

6. Start the application:

   ```bash
   docker compose up -d app
   docker compose ps
   ```

The application defaults to `http://127.0.0.1:3000`. Application startup also runs the safe migration gate. The explicit migration command above is useful before seeding or initial administrator bootstrap; it is not required for ordinary redeploys.

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

The command is repeat-safe: if an administrator already exists, it succeeds without changing any account. Otherwise it creates the administrator unverified; start the application and attempt to sign in once to receive the mandatory verification email. After verification, sign in normally. Never store the administrator password in the long-lived deployment `.env`, shell history, source control or Compose files.

For a non-Docker local PostgreSQL deployment, load the same temporary variables alongside `DATABASE_URL` and run `npm run auth:bootstrap-admin`.

### Invitations and registration

Public Better Auth sign-up remains disabled. Any active, verified account can create and share its own single-use invitations from **My Invitations** or, for administrators, **Admin → Invitations**. Each invitation expires seven days after creation and may be revoked until it is used. Members can only see and manage invitations they created; administrators can oversee all records. Redeeming an invitation creates a `USER` account and sends the mandatory email-verification message; invitations never grant administrator access.

An inactive member uses **Reactivate account** with a new invitation and their existing credentials. WeightPilot restores the original account, preserves its history, and revokes prior sessions. No separate administrator approval is required.

Invitation redemption is transactionally locked in PostgreSQL. Applying the committed migration is therefore required before enabling Phase 3B:

```bash
docker compose run --rm migrate
```

The invitation copy stored for its creator is encrypted with `BETTER_AUTH_SECRET`; keep that secret stable and backed up securely. Rotating it invalidates display/copy access to previously created active codes, although their one-way hashes and redemption records remain intact.

### Personalised assessment questionnaire

Active, verified members use `/en/consultations` or `/es/consultations` to complete the five-step questionnaire. One unfinished draft per member is saved in PostgreSQL and resumes automatically. Completed questionnaires become read-only and unlock a bilingual preliminary comparison at `/en/consultations/results` or `/es/consultations/results`.

Completing a questionnaire does not automatically share it into the administrator review queue. A member must explicitly select **Request personalised review** on the results page. The resulting single review request is visible to the administrator at `/en/admin/questionnaires` or `/es/admin/questionnaires`, where its status can be managed. Duplicate review requests are prevented by the database.

Questionnaire responses are private health information. Keep PostgreSQL on the internal Docker network, restrict database backups, and do not forward request bodies to proxy or application logs. BMI and target-loss calculations are informational only and do not provide diagnosis, prescribing or treatment recommendations.

The comparison is a deterministic server-side educational rules engine. It stores language-neutral outcome keys, highlights relevant cautions without inferring safety from missing information, and never ranks a medicine or chooses a dose. Research links and average results describe specific study populations rather than predicted individual outcomes.

### Reference pricing

The sole administrator manages illustrative monthly treatment and delivery prices at `/en/admin/pricing` or `/es/admin/pricing`. Amounts are stored as integer pence and updates are authorised and validated server-side. The reference calculator supports 6, 12 and 16 months, assumes one purchase and one delivery per month, and does not use questionnaire answers or provide treatment or dose recommendations.

Run the seed after migrations on each environment:

```bash
npm run db:seed:pricing
# or with Docker
docker compose run --rm seed-pricing
```

The seed inserts missing defaults only, so it is safe to rerun and does not overwrite administrator changes. These values are illustrative WeightPilot reference prices, not verified commercial pharmacy prices, checkout totals or offers to sell medicines. Commercial pricing must remain a separate future data source.

### Cloudflare Tunnel or an existing reverse proxy

No proxy is bundled. For a host-installed Cloudflare Tunnel or reverse proxy, send traffic to `http://127.0.0.1:3000`. Keep `APP_BIND_ADDRESS=127.0.0.1` so the application is not exposed directly on every host interface.

A containerised tunnel or proxy can instead join the existing `weightpilot_web` Docker network and use `http://app:3000` as its upstream. Preserve the original `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers, terminate TLS at the existing proxy, and keep `BETTER_AUTH_URL` set to the external HTTPS URL.

Set `AUTH_TRUST_PROXY_HEADERS=true` only when clients cannot reach the application origin directly and the trusted proxy overwrites `CF-Connecting-IP` or `X-Real-IP`. Otherwise leave it `false`. Add any legitimate additional browser origins to the comma-separated `BETTER_AUTH_TRUSTED_ORIGINS`; do not use broad wildcards.

For direct local Docker access, use an HTTP `BETTER_AUTH_URL` such as `http://localhost:3000`. Session-cookie security follows that canonical origin: local HTTP uses an HTTP-only SameSite cookie, while every HTTPS deployment uses a Secure HTTP-only cookie. This keeps local sign-in functional without weakening tunnel or reverse-proxy deployments.

### Authentication email delivery

Email verification, password reset and administrator-reviewed guidance reports use Resend. Set `RESEND_API_KEY` and a verified `EMAIL_FROM` sender in the runtime environment. Builds and containers can start without these values, but emails will not be delivered until they are configured. Email copy follows the selected or preferred language (`en` or `es`). Password-recovery responses intentionally do not reveal whether an email address exists.

The administrator can create and share their own invitations from the Invitations page by email, WhatsApp, SMS or copied link. Invitation emails also use `RESEND_API_KEY` and `EMAIL_FROM`. Shared registration links use `PUBLIC_APP_URL` when set, otherwise `BETTER_AUTH_URL`. The chosen URL must be a public HTTPS origin; localhost is not accepted for sharing. `PUBLIC_APP_URL` is useful when local authentication uses HTTP but links should lead to the public deployment. Resend acceptance confirms submission for delivery, not arrival. A failed email attempt leaves the same invitation available until it is used, revoked or expires.

### Private member messages

Each active, verified member can start one persistent text-only conversation from **Messages**, without completing a questionnaire. Members can read and send messages only in their own conversation; the active, verified administrator can manage conversations from **Administration → Messages**. Message endpoints re-check account status, email verification, role and ownership in PostgreSQL, enforce a 4,000-character limit, and apply per-account send limits. Unread badges refresh periodically; message history is polled every five seconds while a conversation is open.

New-message emails use the existing `RESEND_API_KEY` and `EMAIL_FROM` settings and the recipient's saved language. Notifications contain only a generic alert and a sign-in-required link—never message text or questionnaire information. Delivery is best-effort if Resend is unavailable. No new environment variables or services are required. Apply the new `drizzle/` migration before restarting the app; for Docker, rebuild the app image and run `docker compose run --rm migrate` before `docker compose up -d app`.

For reliable report delivery status, create a Resend webhook pointing to `https://weightpilot.uk/api/webhooks/resend`, subscribe to delivered, failed, bounced, suppressed and complained email events, and set its signing secret as `RESEND_WEBHOOK_SECRET`. WeightPilot records API acceptance separately and changes a review to `COMPLETED` only after a valid signed `email.delivered` event. Ensure the tunnel or reverse proxy forwards this HTTPS path directly to the application.

### Personalised guidance reports

Members see their preliminary assessment immediately and may separately request a personalised report. Preliminary results never include prices. The administrator review workspace shows the submitted questionnaire and a privacy-safe prompt for optional external research; no AI API is called. Drafts autosave in PostgreSQL, and an administrator must review the text and explicitly confirm before sending to the verified account email. Members can see the request status on their assessment results page.

Report emails include a concise assessment summary, reviewed guidance and a secure link to the member's private WeightPilot conversation. The administrator may optionally include the existing 6, 12 or 16-month illustrative reference-price scenario. A pharmacy comparison is optional and requires the administrator to supply the same treatment, amount, period, UK pharmacy/source name, HTTPS source and date checked. WeightPilot does not verify or invent pharmacy prices; the admin must check the linked source. These estimates are informational only, not quotes or offers to sell.

No new environment variables are required. Keep `PUBLIC_APP_URL` set to the public HTTPS origin so report emails can link to the correct private message page. Resend delivery still requires `RESEND_API_KEY`, `EMAIL_FROM`, and a configured webhook secret for confirmed delivery status. Docker startup applies pending committed migrations before serving requests.

### Treatment request decisions and payment email

Members with an available delivered report can submit their contact details from a treatment information page. Administrators can approve for administrative next steps or decline. Approval requires an explicit product and configured strength selection; it is not a prescription or medical suitability decision. The member receives a bilingual payment email at the verified account address, with a secure private-messages link. Resend acceptance is stored with its provider message ID so the approval email is not resent after acceptance.

The optional runtime variables `ACCOUNT_NAME`, `SORT_CODE`, and `ACCOUNT_NUMBER` customise the bank details in the approval email. When unset, the email uses the requested placeholders (`XXXX`, `00 00 00`, and `0000000`); configure real payment details before using approvals. Cash is also offered as an option. The approval email uses the existing `RESEND_API_KEY`, verified `EMAIL_FROM`, and public `PUBLIC_APP_URL`. No new Coolify resource is required. Docker startup applies the committed treatment-request migrations before the application starts.

Sessions are stored in PostgreSQL for seven days, refreshed daily, revoked after a password reset, and issued in secure, HTTP-only cookies in production. Private routes re-check the user record server-side, so inactive or unverified accounts are denied even if an older session cookie still exists.

### Updating

For Coolify production, follow the Dockerfile deployment steps above; production does not use Compose. The following commands are only for the local/self-hosted Compose setup. Back up the database first; the backup is separate from the persistent Docker volume:

```bash
mkdir -p backups
backup_file="backups/weightpilot-pre-release-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_file"
pg_restore --list "$backup_file" > /dev/null
```

Securely copy the archive off-host. Build the application and one-off tools, apply pending migrations, bootstrap only if production has no administrator, and deploy the app last:

```bash
docker compose build app migrate bootstrap-admin
docker compose run --rm migrate
# If the admin count is zero, run the temporary-credential bootstrap below.
docker compose up -d --no-deps app
docker compose ps
```

Check whether bootstrap is necessary without exposing account details, then conditionally run it between migrations and deployment:

```bash
admin_count="$(printf '%s\n' 'SELECT count(*) FROM "user" WHERE role = $$ADMIN$$;' | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At')"
if [ "$admin_count" -eq 0 ]; then
  set -a
  . ./.env.admin
  set +a
  docker compose --profile tools run --rm bootstrap-admin
  unset ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD ADMIN_PREFERRED_LANGUAGE
fi
```

The bootstrap is repeat-safe and never overwrites an administrator. Never keep credentials in the long-lived `.env`. Review `docker compose logs --tail=100 app` after deploy. Do not run `docker compose down -v`, reset the database, or prune volumes. A code rollback does not automatically roll back database migrations.

## Database migrations

Generate migration files after an intentional schema change:

```bash
npm run db:generate
```

Commit the generated `drizzle/` files. Production Docker startup applies them automatically. For local development or explicit maintenance, use `npm run db:migrate` or:

```bash
docker compose run --rm migrate
```

`npm run db:migrate` uses Drizzle's migration-file reader and SHA-256 hashing, retaining the standard `drizzle.__drizzle_migrations` table, timestamps and pending-selection semantics. Preflight, pending SQL and journal inserts share one locked transaction; failure rolls back the batch without changing earlier history. It does not use schema push or load development tooling. The committed journal contains `0000`–`0011`. Existing SQL and hashes must never be edited after deployment.

The preflight stops if a pending migration would drop a non-empty legacy `profiles` table. Back up and inspect those records before deliberately preserving them and retrying. Production has not been accessed by this change.

Run `npm run test:migrations` for startup tests. To include PostgreSQL integration tests, supply `TEST_MIGRATION_DATABASE_URL` pointing **only to an isolated test PostgreSQL instance**, with database-creation permission. Tests create and remove uniquely named disposable databases, test concurrent processes and rollback, and verify migration 0011 against history produced by the official Drizzle migrator. This variable is test-only and must not be configured in production.

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
