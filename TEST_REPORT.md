Local configuration verification: Expo's actual env loader loads `.env.local` + root `.env`; the supplied project URL is `https://fjolamgjdhxoxemhouyk.supabase.co`, the publishable key is present (not printed), `PHOTO_UPLOADS_AVAILABLE` evaluates to true, and bucket is `request-photos`. Firebase env values match their original configuration. Typecheck/lint passed; 50 unit/SQL tests and 32 Firebase emulator tests passed after the bucket alignment. No live storage setup or upload/retrieval was verified.

> Photo configuration repair: changed the required private bucket to `request-photos` in source, SQL, rules, tests and setup documentation. Created the actual ignored root `.env` using the user-supplied Supabase Project URL and publishable key, preserving existing Firebase configuration. Removed blank Supabase overrides from `.env.local`. Nothing has been configured/deployed remotely.

# Photo attachment implementation verification — 2026-11-05

This section supersedes older photo-disabled reports below. All results are local. Nothing was deployed or configured in a live Supabase project, no paid service was enabled, and no physical device was tested.

| Check | Actual result |
| --- | --- |
| `npm.cmd run typecheck` | Passed (`tsc --noEmit`) |
| `npm.cmd run lint` | Passed, zero errors/warnings |
| `npm.cmd test` | 50 passed, 0 failed: existing auth/workflow/history/index coverage plus photo pipeline, form, viewer and PostgreSQL RLS tests |
| `npm.cmd run test:rules` | 32 passed, 0 failed, local Firebase demo emulators; includes atomic Supabase metadata creation/replacement, protected fields/roles, admin priority/start/finish with photos, student isolation and reviewed-request restrictions |
| `node --check functions/scripts/enroll-photos.cjs` | Passed; script was NOT executed against live Firebase |
| `npx.cmd expo export --platform ios --platform android --output-dir .reference/supabase-export` | Both native bundles exported successfully; this is not a physical-device run |

Photo unit coverage executes actual source with native/network stubs: JPEG compression bounds and ArrayBuffer upload, queue before upload, cancellation/failure, no request on upload failure, retry without photo, stable-ID recovery after uncertain creation, URL cache UID isolation/expiry/forced refresh, signed-image rendering/enlargement/error/retry/foreground refresh, listener cleanup, deletion cleanup retry, picker permission/cancel/preview/remove/replace and duplicate-save lock. Firebase token rotation preserves the active form/profile listener.

Six SQL tests execute the complete `supabase/storage.sql` through local PostgreSQL/PGlite, with minimal fixtures for Supabase's auth.jwt/storage schemas. They verify the private bucket limits and RLS: string UID owner-only upload/read/cleanup; protected admin reads; denial for another student, pending UID, anonymous/foreign Firebase identity; protected membership tables; no overwrites or admin deletion; revocation; restrictive guards despite an unrelated broad policy. They do NOT exercise Supabase's hosted JWT verifier, actual Storage HTTP endpoints, MIME enforcement by the service, or signed URL byte retrieval.

Logs/bundles are in ignored `.reference/supabase-unit.log`, `.reference/supabase-rules.log`, `.reference/supabase-export.log` and `.reference/supabase-export/`.

**Outstanding:** create/configure Supabase Free, enable Firebase integration for fixquickproject, trusted enroll student/admin UIDs and set claims, run SQL, set public env values, publish Firestore rules. Then perform the live/physical-device checklist in SUPABASE_PHOTOS_SETUP.md. In particular, a real student upload has NOT been retrieved by an authorized administrator; photos are not yet verified operational.

---

# Quick Fix repair verification
Date: 2026-11-04 (Asia/Dhaka).
Status: source repairs and automated checks completed; live Firebase, physical-device, and visual acceptance remain pending.

## Actual automated results
| Check | Result |
| --- | --- |
| TypeScript: npx.cmd tsc --noEmit | Passed, no diagnostics |
| Lint: npx.cmd expo lint | Passed, zero errors and warnings |
| Search/filter unit tests: npm.cmd test | 2 passed |
| Firestore/Storage emulator suite | 14 passed, 0 failed, isolated demo-quickfix |
| Expo Doctor | 20/20 checks passed |
| Expo install --check | Dependencies up to date |
| iOS native export | Passed; Hermes bundle in dist |
| Android native export | Passed; Hermes bundle in dist |

The security suite tests authenticated owner profile access, student profile creation, rejected role/email/UID forgery, approved profile updates, request ownership, owner/admin/staff query shapes, pending edits/deletes, assignment only by admin to actual staff, assigned staff resolution with required notes, rejected cross-user/unassigned access, rejected invalid transitions, photo size/type/metadata/path validation, authenticated photo retrieval, overwrite rejection, attached-evidence deletion rejection, and atomic immutable history.

An earlier run found an overwrite permission issue (11/12 passed); the rule was corrected and the expanded suite passed. Initial emulator attempts were blocked by missing Java and terminated CLI downloads. A portable Java 21 runtime and official emulator JARs were downloaded locally; their SHA-256 hashes match firebase-tools metadata. No production deployment or test-account creation occurred.

Raw local logs: .reference/rules-run.log and .reference/export-final.log. Generated bundles: dist/metadata.json and dist/_expo/static/js/{ios,android}. These are ignored artifacts.

## What these checks do not establish
Compilation/export is not device execution. Emulator tests use synthetic users and do not establish live provider settings, password validity, production rules deployment, App Check configuration, billing, bucket availability, or existing record compatibility. Camera permissions, native upload transport, persistence after force-closing Expo Go, local notifications, safe areas, keyboard behavior, and visual comparison require the physical-device checklist.

No native screenshots were obtained. All seven proposal pages, nine PNGs, DESIGN.md, and available screen HTML were reviewed. The source now uses native reusable controls, Inter, reference colors, cards, headers, forms, status/priority chips, and four student tabs. The admin management list adapts the reference table to narrow native screens. Screenshot-level fidelity remains unverified.

## Remaining acceptance
Use ACCEPTANCE_CHECKLIST.md and BLOCKERS.md. In particular verify one existing account, one new student/profile, a legitimate missing-profile recovery, a real photo upload and permitted retrieval, admin assignment, staff resolution, airplane-mode viewing, and local alerts on both platforms. Do not label the app fully tested until these have been observed.

npm install also reported 37 dependency audit findings (32 moderate, 5 high). These were not treated as proof of application exploitability or silently resolved with a breaking upgrade; review before release.
## Profile-completion follow-up
The reported deployed owner-GET-only policy was reproduced in an isolated emulator and rejects profile creation. The production create-only transaction, loading/retry flow, and matching profile rules have now been repaired and verified: 20 emulator tests passed, plus 2 search/filter tests; TypeScript and lint passed. Request, assignment, history, and Storage permission tests remain in the suite. See FIREBASE_PROFILE_FIX.md for the exact ten saved fields, complete Console-ready Firestore rules, preserved indexes, and publishing steps. Production rules have NOT been deployed by this session. The deployed policy must be replaced before the real account can create its profile.
## Administrator registration and management follow-up
Source-only implementation; production backend/rules and billing were not changed.

- TypeScript and Expo lint passed with no diagnostics.
- Unit/component suite: 10 passed (badge regressions, combined management filters, role-specific profiles).
- Firestore/Storage emulator suite: 23 passed, including privileged profile validation, rejection of self-escalation, request reassignment/priority audit requirements, student access and direct invitation/role-audit denial.
- Auth/Functions emulator suite: 6 passed using actual callable HTTP requests, including email verification, binding, expiry, single use, concurrency, disabled accounts and preservation of existing data/privileged roles.
- iOS and Android exports passed. Expo Doctor passed 20/20 and dependencies were up to date.
- Source inspection confirms the login page has no forgot-password control, and both registration choices/routes exist.

The callable tests use locally seeded Auth emulator accounts; they do not prove production email delivery, billing, IAM, deployment or physical-device operation. No native screenshots were captured. See FIREBASE_ADMIN_SETUP.md for complete current rules and exact external setup. Raw evidence: .reference/admin-integration.log and .reference/admin-export.log. Functions installation reported 6 moderate audit findings; no forced dependency upgrades were applied.

## Simplified admin registration verification — 2026-11-05

- Type checking and Expo lint passed with no diagnostics.
- Unit suite: 13 passed, covering three-field admin form, one submit action, password visibility, loading/error behavior, no redirect on failed provisioning and dashboard routing only with an admin profile, plus existing profiles/filters/badges.
- Integration suite: 24 Firestore/Storage rules tests and 9 provisioning callable tests passed; exit code 0. Includes denial of allowlist reads/writes even for mobile admins, direct role escalation rejection, allowlisted unverified password-account provisioning with no invitation, missing/unauthorized allowlist rejection, forged email/uid/role ignored, idempotent retries and preservation of existing student data. Existing staff invitations and student data permission tests passed.
- Emulators used demo-quickfix only. Initial attempt could not find Java; completed using the existing portable Java 21 and emulator JARs under .reference. Host Node 26 was used by the emulator; deployed runtime remains Node 22.
- Tests execute the actual screen TSX with mocked native/auth boundaries; they do not replace physical-device visual/keyboard testing. No production deployment, allowlist configuration, live account test, or device execution occurred.

Reproduce with Java 21+ on PATH: npm.cmd run typecheck; npm.cmd run lint; npm.cmd test; npm.cmd run test:integration. In this workspace, set JAVA_HOME to .reference/java21/jdk-21.0.13+9-jre and FIREBASE_EMULATORS_PATH to .reference/emulators (absolute paths), and add JAVA_HOME/bin to PATH first.

## Callable deployment reporting and UID authorization — 2026-11-05

Supersedes prior email-only registration authorization results/instructions.

- npm.cmd run typecheck and npm.cmd run lint: passed, no diagnostics.
- npm.cmd --prefix functions run build: passed (CommonJS syntax checks); callable discovery/loading exercised by emulator tests.
- npm.cmd test: 18 passed, including sign-in-first retry without account creation for existing valid credentials, exact callable/project/region error reporting and failure propagation.
- npm.cmd run test:integration: 24 Firestore/Storage rules tests and 10 callable provisioning tests passed. UID approval supports unverified Auth accounts only after owner approval; legacy email-only approval is rejected even for verified emails. Forged UID/email/role cannot bypass approval. No client role or approval writes allowed.
- npx.cmd expo export --platform ios --platform android: both Hermes production bundles exported successfully to .reference/admin-uid-export. Physical-device execution remains untested.
- Live configured URL returned plain HTTP 404 on an unauthenticated callable-protocol POST. CLI functions:list --project fixquickproject --json failed with "Failed to authenticate, have you run firebase login?" We cannot establish whether another project/region contains an older deployment or inspect the production approval document. No deployment succeeded or was claimed, no live account/profile/configuration was modified, and billing was not enabled.
- Logs: .reference/admin-uid-integration.log and .reference/admin-uid-export.log. Emulator host uses Node 26; deployed runtime remains Node 22. Demo emulators only; no production test accounts.

## Manual pending-admin registration / no billing — 2026-11-05

This section supersedes older callable and email/UID-allowlist authorization descriptions. LOCAL source/rules only; no production publication or account approval occurred.

- npm.cmd run typecheck: passed after Expo regenerated the new /pending-admin route types. No type casts or manual generated-route edits were used.
- npm.cmd run lint: passed, no diagnostics.
- npm.cmd test: 23 passed. Actual screen TSX is executed with native/Auth mocks, including three fields/one submit, password toggle, pending message, protected-route gate, safe existing-account recovery and failed-write handling. Photo upload rejects before file/Auth/Storage access.
- npm.cmd run test:integration: 29 Firestore/Storage rules tests plus 6 legacy provisioning tests passed (35 total). Includes real pending-profile creation/retry, rejected role/approval forgery, denied pending reads/queries/actions, preserved student data/roles, Console-equivalent manual approval enabling request management, and a live profile snapshot receiving approval without another login.
- Rules coverage runs locally without requiring Cloud Functions using npm.cmd run test:rules; the integration run additionally checks the preserved optional legacy invitation backend. Emulators use isolated demo-quickfix only, with existing portable Java 21/cache. Host Node 26; legacy Functions runtime remains Node 22.
- npm.cmd --prefix functions run build: passed CommonJS syntax checks after removal of registerAdmin export/handler.
- npx.cmd expo export --platform ios --platform android: both production Hermes bundles passed in .reference/admin-pending-export. Expo Go physical-device/visual/keyboard acceptance remains pending.
- Logs: .reference/admin-pending-integration.log, .reference/admin-pending-rules.log and .reference/admin-pending-export.log.

Storage emulator authorization tests establish rules behavior only. They do NOT establish that production Firebase Storage works without Blaze. Uploads remain unavailable pending an owner storage decision; no replacement, bucket mutation, billing enablement, image migration or live Storage success is claimed. See PHOTO_STORAGE_STATUS.md and Firebase's current Storage billing FAQ.

## Direct administrator workflow verification — 2026-11-05

This supersedes historical assignment/Resolved/staff workflow results. Source changes only; production rules/accounts/data/indexes were not changed.

| Actual check | Result |
| --- | --- |
| npm.cmd run typecheck | Passed, no diagnostics |
| npm.cmd run lint | Passed, no errors/warnings |
| npm.cmd test | 27 passed, 0 failed |
| npm.cmd run test:rules | 22 passed, 0 failed after repair |
| npm.cmd run test:integration | 22 rules/client-service tests plus 6 preserved historical backend tests passed; exit 0 |
| iOS production Hermes export | Passed |
| Android production Hermes export | Passed |

Security coverage includes every pair in the five-status transition matrix, valid direct approve/start/finish/reject with no assignment fields, required completion/rejection text, actor UID/server timestamps, failed request writes leaving no history, orphan/forged/immutable history, terminal records locked, Pending-only student edit/delete, owner-only queries/history, denied student/pending/legacy-staff admin actions, manual Console-equivalent approval, retained profile recovery/concurrency tests, unchanged existing roles, and inert legacy assignment fields without a migration. The actual production service is exercised against emulator rules for create/edit/approve/start/finish and denied student transitions.

Realtime coverage subscribes simultaneously to the owner's permitted request feed, details document and history, then verifies the same Finished status and completion notes arrive without restarting or reauthenticating; listeners are unsubscribed. Unit tests also verify detail listener errors/unsubscription/late-callback suppression, all five filter/badge values, legacy Resolved->Finished, unknown statuses, actual AdminRequestActions buttons, required-input disabled actions and absence of both removed cards/assignment controls in actual Details TSX. Existing login/admin-registration/manual-approval tests remain passing.

The first pass found a student-edit test fixture emitting Priority changed instead of Updated; it was corrected to match the production edit service. Two effect implementations were adjusted to derive request-scoped state and satisfy React lint. Initial failures are not reported as passes; the final reruns passed.

Logs/artifacts: .reference/admin-direct-rules.log, .reference/admin-direct-integration.log, .reference/admin-direct-export.log and .reference/admin-direct-export. Tests used demo-quickfix only with local Java 21 and emulator cache. The legacy backend emulator used host Node 26; deployed backend runtime configuration remains Node 22, and that backend is not required by the active app.

No production database inventory, rule publication, live account operation, native screenshot or physical-device execution was performed. Emulator Storage tests establish access control only; Firebase Storage uploads remain unavailable pending a supported storage decision. Visual/keyboard/foreground/background behavior on physical iPhone/Android is still pending the acceptance checklist. See WORKFLOW_UPDATE.md for COMPLETE rules and exact publication/compatibility steps.

## Save Priority / Mark Finished denial follow-up — 2026-11-05

Actual checks: typecheck passed; Expo lint passed; 27 unit tests passed; 26 emulator security/service tests passed, zero failed. The pre-repair baseline passed the approved-admin operations against the existing local rules but failed a new student unchanged-priority regression (23/24 passed). The service now checks the saved admin role before no-op handling. Tests exercise actual Low/Medium/High service calls in all mutable states without transition fields, Mark Finished with notes/UIDs/server timestamps, rejected student/no-op/finish actions, legacy fields/Resolved compatibility and atomic rollback.

A saved historical rules fixture matching the user's reported old deployed schema rejects both request updates. A separate emulator-only composition of current request rules and the unmodified historical history block rejects both otherwise-valid operations, isolating the history incompatibility. The final rules permit the complete legitimate transactions while rejecting omitted/forged history. The SDK itself does not identify which member of a live atomic write was denied.

Logs: .reference/admin-operations-before.log and .reference/admin-operations-final.log. Full payload/diagnosis/publication guide and COMPLETE rules: ADMIN_OPERATIONS_FIX.md. No production policy was fetched/published, no live account/record was changed, and no physical-device behavior was tested. This check does not claim that local changes have repaired the deployed policy; the owner must publish the ENTIRE current firestore.rules to fixquickproject.

## Student dashboard index / listener diagnostics — 2026-11-05

Actual results: TypeScript passed; Expo lint passed; npm.cmd test passed 29/29. New tests exercise the executed student feed query and its exact ownerId ASC / createdAt DESC COLLECTION index declaration, preserve the existing status ASC / createdAt DESC definition, and prove original failed-precondition/permission-denied/unavailable codes/messages/Console links/error-object identity survive development logging. Production diagnostics are gated off.

The required composite was already declared locally, so firestore.indexes.json was preserved without duplicate definitions. No production index inventory/readiness was verified and no deployment was performed. No security rule or network configuration change was made. Saved logs supplied no matching mobile Listen/WebChannel warning trace; live transport persistence could not be determined. See FIRESTORE_INDEX_SETUP.md for the exact index-only deployment command and manual Console instructions. Emulators are not used as evidence that production composite indexes exist or are ready.

## Student edits and per-user history deletion — 2026-11-05

Implemented locally; no production publication/accounts/data changes. Actual results: typecheck passed; Expo lint passed; npm.cmd test passed 34/34; npm.cmd run test:rules passed 31/31; iOS/Android production exports passed. Device behavior/visual fidelity remain unverified.

Unit coverage executes real TSX for owner-only Pending edit controls and the prefilled form, validates all correction fields/protected keys, locks duplicate button presses, shows success/error states, preserves disabled photo upload, and executes both student/admin History confirmation, Undo/Restore and empty-state behavior. The private listener test checks own-user path, server-only preference readiness, error logging, account-change guard and unsubscribe behavior.

Emulator coverage exercises actual full-field corrections, admin realtime observation, preserved ID/owner/creation/status/admin/evidence fields, server updatedAt and one matching edit event, unchanged retries, safe concurrent rejection without duplicate events, protected/reviewed/other-student denials, per-user Finished/Rejected/legacy Resolved hide/restore, cross-account privacy even for admins, terminal-only hiding and unchanged shared request timestamps/audits/operational counts. Existing workflow/admin/manual-approval regression tests remain passing.

Initial testing used concurrent identical service calls and surfaced stale before/after audit values on the losing transaction, sometimes exhausting rule-expression evaluation while rejecting it. Rule coverage confirmed one full edit was accepted. Exact audit-map matching and cached role/parent validation reduced duplicate rule work; the final suite distinguishes a successful full edit, a no-op retry and allowed safe concurrent rejection. No audit/permission invariant was bypassed to make tests pass.

Logs: .reference/student-history-rules.log and .reference/student-history-export.log; exports: .reference/student-history-export. Complete current policy and exact owner publication steps: STUDENT_EDIT_HISTORY.md and firestore.rules. Publishing the new private preference match is still required; source code cannot override deployed rules. No new composite index, Cloud Functions, billing or storage-provider change is required.
