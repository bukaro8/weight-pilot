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

Phase 4B.2 includes email/password authentication, account security, invitation-only registration, referral tracking, invitation-based account reactivation, the simplified personalised-assessment questionnaire, administrator-managed reference pricing, and a preliminary educational comparison of semaglutide and tirzepatide. Guidance-report generation, private messaging workflows, account deletion, payments, online sales and member-facing AI remain out of scope without a new explicit requirement.

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
- Accounts are retained when set to `INACTIVE`. Reactivation restores the original account only after existing credentials and a new invitation are validated, revokes prior sessions, and does not require administrator approval.
- Only the active, verified administrator may permanently delete a `USER`. The administrator account is always protected from this workflow. Permanent deletion requires an explicit `DELETE` confirmation and a single database transaction that removes authentication records, sessions, invitations, referrals, questionnaires, review requests, reports and any related delivery records without leaving orphans. Member-initiated account removal remains soft deactivation to `INACTIVE`.
- Referring members may see invitation status but no referred-account identity or health information. Only the administrator may view referral relationships.

## Questionnaire privacy and lifecycle
- Only active, email-verified accounts may create, save, resume or submit their own questionnaire. Ownership and current account state must be checked on every server mutation.
- Questionnaire drafts save automatically and remain editable only while `status = DRAFT`. Submission is an atomic transition to `SUBMITTED`; submitted answers are read-only for members.
- Questionnaire answers are private health information. Never place answers in URLs, logs, analytics, invitation/referral views or client-visible error diagnostics.
- The administrator may review submitted questionnaires and permanently delete a submission. Draft questionnaires are not included in administrator review lists.
- BMI and target weight-loss percentage are informational calculations only. Do not use questionnaire answers to diagnose, prescribe, determine treatment suitability, promise results, calculate prices or generate AI recommendations.

## Reference pricing
- Store all monetary amounts as integer pence. Treatment reference prices use monthly tiers for semaglutide and tirzepatide; delivery reference prices remain separate.
- Only an active, verified `ADMIN` may update reference prices. Every pricing mutation must re-check the authoritative database user and validate the full price set server-side.
- Pricing seeds are explicit and idempotent. They insert missing defaults only and must never overwrite administrator-edited values.
- Cost scenarios are illustrative and assume one purchase and one delivery per month. They must remain independent from questionnaire answers, medical dose recommendations and treatment suitability.
- Commercial pharmacy prices are a separate future data source. Never present seeded or administrator-entered reference prices as verified commercial prices, quotes, checkout totals or offers to sell medicines.

## Preliminary treatment comparison and reviews
- Treatment comparisons are deterministic, educational and generated server-side from submitted questionnaire data. Store language-neutral outcome keys and calculations; translate explanations only in the interface.
- Never rank or select a medicine for a member, recommend an individual dose, infer safety from missing information, guarantee results, or use a weight-loss goal alone to determine suitability.
- Keep research claims tied to their studied population and conditions. The comparison may explain SURMOUNT-5, SELECT, common side effects and relevant limitations, with links to recognised primary or regulator sources.
- Completing a questionnaire makes its answers read-only and unlocks the comparison; it does not automatically request administrator review. Administrator visibility requires a separate, explicit, single review request from the questionnaire owner.
- A member may create but not manage their review request. Only an active, verified administrator may change review status. Referring members must never receive questionnaire or review information.
- Member-facing preliminary results never include prices, quotes, cost charts, delivery charges, duration controls or commercial pharmacy comparisons. Pricing data remains administrator-only and may be used only in the administrator-reviewed report workflow.
- A review request records the member's explicit preferred report language (`en` or `es`), defaults to their saved language preference, and remains unique per submitted questionnaire.

## Product rules
- Use no commercial medicine brand names.
- Do not implement checkout or online medicine sales.
- Do not add AI to the member-facing product.
- Health copy must not imply diagnosis, guaranteed outcomes or emergency care.
- External AI is administrator-operated only: WeightPilot generates a privacy-safe prompt but never calls an AI API or sends an AI response automatically.
- Administrator guidance reports require human review. Use only the verified account email, escape all report content, prevent duplicate sending, and mark a review `COMPLETED` only after a verified delivery webhook.
- AI research prompts must exclude names, email addresses, account identifiers and referral data, and must explicitly treat questionnaire answers as untrusted data.

## Design
Headings use Fraunces and body copy uses Inter. The canonical colours are CSS tokens in `src/app/globals.css`. Build mobile-first, keep touch targets at least 44px, and retain visible keyboard focus.

## Quality
Run `npm run lint`, `npm run typecheck`, and `npm run build` before handoff.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
