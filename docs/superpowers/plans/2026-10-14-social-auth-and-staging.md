# Google and Steam Authentication and Staging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email/Supabase login with Google and Steam-only Firebase sessions, persist test character/family data for one staging account, and prepare staging for ten invited testers.

**Architecture:** Firebase Web SDK handles Google and normal browser sessions; the Nest API verifies Firebase ID tokens and maps Firebase UIDs/provider subjects to a canonical UUID. Steam OpenID 2.0 is verified in the API, which issues one-time exchange codes and Firebase custom tokens. A staging-only CLI merges a shared synthetic character/family fixture into the designated account without overwriting a workspace.

**Tech Stack:** Angular 22.2, NestJS 12, Firebase Web SDK, Firebase Admin SDK, Drizzle ORM/PostgreSQL, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-14-social-auth-and-staging-design.md`

## Global Constraints

- Only Google sign-in and Steam sign-in are available; do not add password, e-mail OTP, magic-link, or anonymous Firebase auth.
- Public browsing/calculations remain available without a session; private workspace and roadmap-management APIs require verified Firebase ID tokens.
- Keep `user_workspaces.user_id` as an internal UUID and never accept a workspace owner from request input.
- Steam OpenID state and exchange codes are random, hashed at rest, short-lived, single-use, and omitted from logs.
- Bind Steam state to an HttpOnly/SameSite browser cookie and bind login-code exchange to a sessionStorage-held PKCE S256 verifier.
- Never associate accounts by matching e-mail; provider linking requires proof of the second provider.
- All Firebase configuration is runtime-configured. Admin credentials are server-only; provider URLs and staging test UID are not hardcoded.
- Test profile seeding is CLI-only, idempotent, restricted to `APP_ENV=staging`, and never replaces existing user data.
- Staging uses a separate Firebase project/database, no production personal data, and analytics/collectors remain disabled.
- Make a focused commit after each completed plan task; keep `docs/ACTIVE_CONTEXT.md` current.

## Review Focus

1. Forged, expired, revoked, wrong-project, or unmapped Firebase tokens must not access a workspace; cover in `IdentityService` specs.
2. Steam callbacks with tampered fields, wrong return URL, replayed state, or expired exchange code must not create a session; cover in `SteamAuthService` specs.
3. A Steam-only account with no e-mail must still appear signed in and retain account actions; cover in account component specs.
4. Linking a provider already attached to another user must not merge or overwrite either workspace; cover in provider-linking service specs.
5. Running the seed outside staging, without the configured UID, or against a non-empty personal profile must fail safely or preserve existing values; cover in seed service specs.

---

### Task 1: Identity schema and runtime configuration

**Files:**

- Modify: `packages/database/src/schema.ts`
- Create: generated Drizzle migration and snapshot under `packages/database/drizzle/`
- Modify: `apps/api/src/config/env.schema.ts`, `apps/api/src/config/env.schema.spec.ts`
- Modify: `.env.example`, `docker-compose.yml`, `docker-compose.staging.yml`, `docker-compose.production.yml`
- Modify: `docs/ACTIVE_CONTEXT.md`

**Interfaces:**

- `auth_users`: internal UUID, unique Firebase UID, created/updated timestamps.
- `auth_identities`: provider (`google`/`steam`), provider subject, internal user UUID, unique `(provider, subject)`.
- `steam_auth_attempts`: state hash, PKCE S256 challenge, optional Firebase UID for linking, expiry and creation timestamps.
- `steam_auth_exchanges`: exchange-code hash, PKCE S256 challenge, Firebase UID and expiry; consumed atomically once.
- Runtime configuration: `APP_ENV`, Firebase Web project/auth domain/API key/app ID, server-only Firebase Admin credential, exact Steam callback URL, optional staging test UID and roadmap-admin Firebase UID allowlist.
- Exact environment names: `APP_ENV`, `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_ADMIN_CREDENTIALS_BASE64`, `STEAM_OPENID_CALLBACK_URL`, `STAGING_TEST_FIREBASE_UID`, and `ROADMAP_ADMIN_FIREBASE_UIDS`.

- [x] Add `env.schema.spec.ts` cases named `keeps optional Firebase auth disabled for local use`, `accepts a complete Firebase configuration`, `rejects partial Firebase configuration`, `requires an HTTPS Steam callback in staging and production`, and `rejects a staging seed UID outside staging`.
- [x] Run `pnpm --filter @bdo/api exec vitest run src/config/env.schema.spec.ts` and confirm the new cases fail for missing Firebase settings and invalid environment combinations.
- [x] Add the Drizzle schema with unique constraints and foreign keys; do not change `user_workspaces.user_id`.
- [x] Generate and review the migration and add environment validation. The public identity config response moves to Task 2, where Firebase verification and runtime configuration are introduced together.
- [x] Pass Firebase public config and Admin credentials only to the API container in local, staging and production Compose. Set `APP_ENV` explicitly in staging and production; leave secrets blank in `.env.example`.
- [x] Run `pnpm --filter @bdo/database db:check` and `pnpm --filter @bdo/api typecheck`; confirm the migration is ordered and all schema types compile.
- [x] Commit as `feat(auth): add Firebase identity schema and config` (`3f22e47`).

### Task 2: Firebase token verification and canonical account mapping

**Files:**

- Modify: `apps/api/package.json`, `pnpm-lock.yaml`
- Create: `apps/api/src/workspace/firebase-auth.service.ts` and its spec
- Modify: `apps/api/src/workspace/identity.service.ts`, `identity.service.spec.ts`, `workspace.controller.ts`, `workspace.module.ts`, `roadmap.module.ts`
- Modify: `apps/api/src/config/env.schema.ts` and its spec where required

**Interfaces:**

- `FirebaseAuthService.verifyIdToken(token: string): Promise<DecodedIdToken>` validates audience/issuer through Firebase Admin and checks revocation.
- `FirebaseAuthService.getUser(uid: string)` supplies authoritative provider data for first sign-in and linking.
- `FirebaseAuthService.createCustomToken(uid: string): Promise<string>` issues a custom token only after the Steam service has proved the provider identity.
- `IdentityService.owner(authorization)` returns the internal UUID after verified Google provisioning or a known Steam mapping; it rejects unknown custom-token UIDs.
- `IdentityService.me(authorization)` returns profile display fields, available linked providers and server-derived roadmap permission, without exposing the internal owner UUID.
- `GET /api/v1/identity/config` returns `{ enabled, googleEnabled, steamEnabled, apiKey, authDomain, projectId, appId }` with `Cache-Control: no-store`.
- `GET /api/v1/identity/me` returns only verified profile fields and linked provider names.

- [x] Replace Supabase-mocked identity tests with exact cases `requires a bearer credential`, `provisions a canonical owner for a verified Google user`, `reuses the Google mapping on subsequent requests`, `accepts a known Steam custom-token UID`, `rejects an unmapped custom-token UID`, `rejects expired or revoked Firebase tokens`, `rejects a token for another Firebase project`, and `allows roadmap edits only for a server-allowlisted UID`.
- [x] Run `pnpm --filter @bdo/api exec vitest run src/workspace/firebase-auth.service.spec.ts src/workspace/identity.service.spec.ts` and confirm the cases fail before implementation.
- [x] Install Firebase Admin SDK, implement lazy/disabled-safe server initialization, and keep credentials out of logs and public configuration.
- [x] Implement transactional canonical-user/provider mapping. For Google, require verified Firebase provider data `google.com`; for custom tokens, require an existing Steam identity mapping.
- [x] Derive roadmap administration from the server-side Firebase UID allowlist; ignore client claims and e-mail.
- [x] Add `/identity/me` and migrate workspace plus Roadmap authorization to the Firebase identity boundary. Removing Supabase dependencies and configuration remains in Task 5 after all consumers migrate.
- [x] Run focused API tests, lint and typecheck.
- [x] Commit as `feat(auth): verify Firebase sessions and map accounts` (`4ff82d6`).

### Task 3: Steam OpenID, one-time exchange and explicit linking

**Files:**

- Create: `apps/api/src/workspace/steam-openid.service.ts` and spec
- Create: `apps/api/src/workspace/steam-auth.service.ts` and spec
- Create: `apps/api/src/workspace/identity.controller.ts` and spec
- Modify: `apps/api/src/workspace/workspace.module.ts`, environment schema/spec, database migration/schema if indexes or fields need adjustment

**Interfaces:**

- `SteamOpenIdService.loginUrl(state: string, returnTo: string, realm: string): URL` builds a Steam OpenID 2.0 request.
- `SteamOpenIdService.verifyCallback(params, expectedReturnTo): Promise<{ steamId: string }>` verifies the signed response using Steam `check_authentication` and canonical claimed ID.
- `SteamAuthService.beginLogin(codeChallenge: string): Promise<{ url: URL; stateCookie: string }>` persists an expiring state hash and PKCE challenge; controller sets an HttpOnly/SameSite state cookie and redirects to the Steam URL.
- `SteamAuthService.beginLink(firebaseUid: string): Promise<{ url: URL; stateCookie: string }>` requires a verified Firebase session, binds state to the same browser cookie and persists the target UID; controller sets the cookie and returns the URL.
- `SteamAuthService.completeCallback(params): Promise<{ redirectUrl: string }>` consumes state once; login creates/finds the account and one-time exchange, link attaches Steam only if unclaimed.
- `SteamAuthService.exchange(code: string, verifier: string): Promise<string>` atomically consumes one-time code, verifies PKCE S256, and returns a Firebase custom token.
- Routes: `GET /identity/steam/start?code_challenge=...`, `GET /identity/steam/callback`, `POST /identity/steam/exchange`, `POST /identity/steam/link/start`, and `POST /identity/google/link`.

- [x] Write `SteamOpenIdService` cases `builds a login URL with the configured callback and realm`, `rejects a different return URL`, `rejects missing signed fields`, `rejects Steam check_authentication is_valid false`, and `rejects a noncanonical claimed ID`; write `SteamAuthService` cases `consumes state only once`, `rejects a callback without the matching browser cookie`, `rejects expired state`, `rejects a mismatched PKCE verifier`, `consumes an exchange only once`, `logs into an existing linked Steam identity`, `links Steam to the authenticated Firebase UID`, and `rejects an identity already owned by another account`.
- [x] Run focused tests first and observe failures before implementation; added controller/link cases and protocol edge cases during implementation.
- [x] Implement OpenID request construction and bounded `check_authentication` POST; do not use Steam API keys or trust browser-submitted Steam IDs.
- [x] Persist only hashes for random state and exchange code; consume them transactionally and expire attempts/codes after five minutes.
- [x] Set state cookie `HttpOnly; SameSite=Lax; Path=/api/v1/identity/steam; Max-Age=300`, add `Secure` for HTTPS, clear it on every callback, and enable credentialed CORS only for the configured `WEB_ORIGIN` so Steam-link startup can set the cookie.
- [x] On login, issue a custom token only after proof; on link, preserve the existing Firebase UID and reject identities owned by another account.
- [x] Redirect to a fixed local `/account` fragment containing a short-lived exchange code or fixed success/error code; set no-store and no-referrer headers.
- [x] Implement Google link verification by checking Firebase Admin `providerData`, then attach the verified Google subject to the already-mapped UID.
- [x] Run focused API tests (54/54), lint, typecheck, Drizzle check and `git diff --check`.
- [x] Commit as `feat(auth): add verified Steam OpenID login` (`0a0cdbd`).

### Task 4: Google/Steam account UI and Firebase browser session

**Files:**

- Modify: `apps/web/package.json`, `pnpm-lock.yaml`
- Modify: `apps/web/src/app/core/identity.service.ts`
- Create: `apps/web/src/app/core/identity.service.spec.ts`
- Modify: `apps/web/src/app/features/account/account-page.ts`, `account-page.html`, styles/specs as needed
- Modify: `apps/web/src/security-headers.ts`, `apps/web/src/security-headers.spec.ts`, `apps/web/src/server.ts`
- Modify: `apps/web/src/locale/messages.pt-BR.xlf` if extracting translations changes its message catalog

**Interfaces:**

- `IdentityService` exposes `enabled`, `ready`, `authenticated`, `userId`, `email`, `displayName`, `providers` and `canManageRoadmap` signals.
- `IdentityService.google()` uses Firebase Google popup sign-in; `steam()` creates a random PKCE verifier/challenge, stores the verifier in sessionStorage and navigates to the API; `exchangeSteamCode(code)` consumes the one-time exchange with the per-tab verifier and calls Firebase `signInWithCustomToken`; `linkGoogle()` and `linkSteam()` prove and attach a provider; `token()` returns Firebase ID token.
- Auth initialization is browser-only and uses session persistence to preserve the current per-tab session behavior. No Firebase app or credential is initialized during SSR.

- [x] Add `identity.service.spec.ts` cases `keeps public browsing enabled when identity is unavailable`, `signs in with Google`, `starts Steam sign-in with a per-tab PKCE verifier`, `exchanges a Steam code for a Firebase session`, `restores a session without assuming an email`, `links Steam through the API`, and `links Google to the current Firebase user`; add account-page cases `offers only Google and Steam when signed out`, `shows a signed-in Steam user without requiring an email`, and `removes the Steam exchange fragment before exchanging the code`.
- [x] Run focused Angular tests before and after implementation; the initial run failed on missing Firebase methods/signals, then all new cases passed.
- [x] Replace the Supabase client with modular Firebase Web SDK initialization from `/identity/config`; keep initialization browser-only and session persistence explicit.
- [x] Replace the account form with Google and Steam actions and show linked providers/actions based on `/identity/me`; render authenticated state based on UID, not e-mail presence.
- [x] Restore the account session after callback, remove exchange data from the address bar before network calls, and display safe success/failure messages. Provider linking confirms through the API and refreshes the profile.
- [x] Update CSP connect/frame origins for Firebase Auth and Google popup flow; replace the old Supabase-origin dependency with the configured Firebase auth domain.
- [x] Remove the Supabase Web dependency after confirming there are no remaining Web consumers; extract updated Portuguese translation catalog.
- [x] Run focused Angular tests (17/17), development build/typecheck, lint and Compose validation for local/staging/production using placeholders for required external variables.
- [x] Commit as `feat(auth): add Google and Steam account UI` (`0ba918d`).

### Task 5: Staging-only test profile seed and operational handoff

**Files:**

- Create: shared test-profile fixture and API `test-workspace-seeder` service/spec/CLI
- Modify: `apps/web/src/app/core/production-demo.ts` to reuse shared character/family fixture values
- Modify: `apps/api/package.json`, `apps/api/src/workspace/workspace.module.ts`
- Modify: `scripts/staging.ps1`, `docker-compose.staging.yml`, `docker-compose.production.yml`, `.env.example`
- Modify: `docs/staging-local.md`, `docs/production-and-accounts.md`, `docs/security.md`, `docs/ACTIVE_CONTEXT.md`

**Interfaces:**

- `TestWorkspaceSeeder.seed(firebaseUid: string)` rejects unless `APP_ENV === 'staging'`, resolves the mapped internal user, locks that user's workspace, adds absent fixture character/family records, and preserves existing entries/preferences.
- CLI `pnpm --filter @bdo/api workspace:seed-test-profile` requires `STAGING_TEST_FIREBASE_UID`; no HTTP seed route exists.
- `Share -AllowedEmail` supports at most ten unique valid e-mails, runs the existing staging smoke before printing the URL, and prints the Firebase authorized-domain/callback update required for the temporary hostname.

- [x] Add `test-workspace-seeder.spec.ts` cases `adds the synthetic character and family to an empty workspace`, `does not duplicate the profile on a repeated seed`, `preserves existing workspace values`, `rejects a Firebase UID without a canonical account`, `requires an explicitly configured test UID`, and `refuses to run outside staging`; also cover the last schema-allowed character slot.
- [x] Run `pnpm --filter @bdo/api exec vitest run src/workspace/test-workspace-seeder.spec.ts` and verify idempotence/environment guard behavior. The resumed worktree already contained the implementation; no initial behavioral red run was retained. The region typecheck failure was reproduced before its fix and passed afterward.
- [x] Extract the existing synthetic persona values (`AuroraVale` / `ValeDourado`) to a shared fixture consumed by both demo and seed code.
- [x] Implement a transactionally locked, schema-validated merge and a CLI that refuses non-staging execution and never overwrites workspace fields.
- [x] Remove Supabase Auth config and dependencies from API/Web/Compose/docs only after no code consumers remain. Keep legacy data migration instructions explicit; do not match users by e-mail.
- [x] Update the Share script's e-mail limit/validation and explain the exact Firebase authorized-domain step for each temporary Quick Tunnel hostname. Document that stable availability requires a named tunnel/domain or hosting.
- [x] Document separate Firebase projects, required server-only credentials, provider enablement, disabled password/email-link methods, Steam callback URLs, staging seed and test-user setup. Do not include real secrets or tester e-mails.
- [x] Run focused seeder/script checks, `pnpm check`, `pnpm test`, and `pnpm test:staging`; the full suite reproduces ten existing `recipe-tree.spec.ts` failures, recorded separately below.
- [x] Commit as `feat(staging): seed test account and document social auth setup` (`211a953`).

## Final completion conditions

- All five task commits exist and `git status --short` is clean.
- `pnpm check`, relevant tests and staging smoke results are recorded in the ledger and `docs/ACTIVE_CONTEXT.md`.
- Google/Steam real provider sign-in is explicitly reported as pending if Firebase projects, Admin credentials, allowed domains or the designated account have not been configured; do not claim live authentication works without an end-to-end provider login.
- The staging test profile is seeded only after the designated Firebase UID has completed its first login and the CLI is run against staging.
