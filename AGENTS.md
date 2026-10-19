# WeightPilot project guide

## UI/UX — HIGH PRIORITY

WeightPilot must look and feel like a premium,
modern, professional weight-management information platform.

- Design mobile-first, starting at 375px.
- Support screens down to 320px.
- Use a refined, consistent visual system.
- Follow the defined WeightPilot colour palette.
- Use Fraunces headings and Inter body text.
- Prioritise typography, spacing and hierarchy.
- Avoid generic, unstyled shadcn layouts.
- Use elegant, subtle interactions and animations.
- Respect reduced-motion preferences.
- Provide polished loading, empty and error states.
- Keep primary actions clear and accessible.
- Use touch targets of at least 44x44px.
- Prevent horizontal scrolling.
- Ensure excellent English and Spanish layouts.
- Keep forms short, intuitive and mobile-friendly.
- Maintain WCAG AA accessibility.
- Do not introduce unnecessary visual clutter.

Before completing any UI task:
1. Check mobile and desktop layouts.
2. Check both supported languages.
3. Check accessibility and responsiveness.
4. Verify visual consistency with existing pages.
5. Fix layout issues before reporting completion.

Visual quality is a core requirement, not optional.

## Scope and stack
WeightPilot is a bilingual, mobile-first Next.js App Router foundation using TypeScript, Tailwind CSS, shadcn/ui conventions, PostgreSQL with Drizzle ORM, Better Auth, next-intl, Resend and Zod. All application code lives under `src/`.

Phase 3B includes email/password authentication, account security, invitation-only registration, referral tracking and invitation-based account reactivation. Personalised assessments, guidance-report generation, private messaging workflows, account deletion, payments, online sales and member-facing AI remain out of scope without a new explicit requirement.

## Brand positioning
WeightPilot is a private, personalised weight-management information and guidance platform. It is not a clinic, healthcare provider, medical service or emergency service.

- In English, prefer: guidance, personalised assessment, weight-management options, evidence-informed information, and personalised guidance report.
- In Spanish, prefer: orientación, asesoramiento personalizado, evaluación personalizada, opciones para el control de peso, and información basada en evidencia.
- Never describe WeightPilot's own offering as clinical care, medical care, a clinical or medical consultation, a treatment plan, or a patient service. Do not use equivalent Spanish wording such as atención clínica, consulta médica, plan de tratamiento, or paciente for WeightPilot users or platform features.
- Preserve accurate medical terminology when discussing general health information, research, medicines, side effects, risks, surgery, or when advising users to seek independent professional medical advice.
- Platform copy must not imply that WeightPilot determines treatment suitability, guarantees results, or employs professionals with qualifications that have not been explicitly established.

## Architecture
- Route groups live below `src/app/[locale]`: `(public)`, `(auth)`, `(member)`, and `(admin)`.
- Reusable UI belongs in `src/components`; feature-specific code belongs in `src/features`.
- Server-only infrastructure belongs in `src/db` and `src/lib`; never import it into client components.
- Use `src/lib/authorization.ts` for authoritative server-side member/admin checks. UI visibility is never authorisation.
- Keep secrets in environment variables and placeholders in `.env.example`; never commit credentials.
- Preserve the current pathname when changing locale. Every user-facing string must exist in English and Spanish.

## Authentication, invitations and account security
- Better Auth is the only application authentication layer and uses the Drizzle PostgreSQL adapter.
- Better Auth public sign-up remains disabled. New member accounts may be created only by the server-side invitation redemption transaction; direct authentication API calls must never bypass invitations.
- Email verification is mandatory before a private session can be created. Password-reset requests must never reveal whether an address exists.
- Private access requires a fresh database record with `status = ACTIVE` and `emailVerified = true`; administrator access additionally requires `role = ADMIN`.
- WeightPilot has exactly one administrator. The database partial unique index is authoritative, and the only Phase 3A creation path is the one-time `auth:bootstrap-admin` command.
- Never accept role, status, verification state or account ownership from the browser. Do not add public admin registration.
- Keep migrations explicit and independent of application startup. Authentication email delivery may be unconfigured during builds, but production verification and recovery require Resend credentials.
- Invitations use cryptographically random single-use codes, expire after seven days, and may be revoked while unused. Store only a hash for lookup and an application-secret-encrypted copy for the creator's copy/link interface; never log codes or expose them to administrators.
- Only active, email-verified accounts may create invitations. Registration always creates an unverified `USER`; referral codes can never assign the `ADMIN` role.
- Invitation consumption and account creation/reactivation must remain in one database transaction with a row lock and conditional consume, so concurrent redemption cannot succeed twice.
- Accounts are retained when set to `INACTIVE`. Reactivation restores the original account only after existing credentials and a new invitation are validated, revokes prior sessions, and does not require administrator approval. Permanent deletion is reserved for the administrator and remains unimplemented.
- Referring members may see invitation status but no referred-account identity or health information. Only the administrator may view referral relationships.

## Product rules
- Use no commercial medicine brand names.
- Do not implement checkout or online medicine sales.
- Do not add AI to the member-facing product.
- Health copy must not imply diagnosis, guaranteed outcomes or emergency care.

## Design
Headings use Fraunces and body copy uses Inter. The canonical colours are CSS tokens in `src/app/globals.css`. Build mobile-first, keep touch targets at least 44px, and retain visible keyboard focus.

## Quality
Run `npm run lint`, `npm run typecheck`, and `npm run build` before handoff.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
