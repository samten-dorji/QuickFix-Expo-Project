> Existing-account photo enrollment: added `supabase/enroll-photo-users.sql` with the exact authorized admin/student UIDs. Firebase custom claims were set and read-back verified remotely after checking their enabled Auth accounts and matching existing Firestore roles. No Firestore role was changed. Supabase membership SQL remains unapplied; full photo access is not yet confirmed. See the current status at the top of SUPABASE_PHOTOS_SETUP.md.

> Photo configuration repair: changed the required private bucket to `request-photos` in source, SQL, rules, tests and setup documentation. Created the actual ignored root `.env` using the user-supplied Supabase Project URL and publishable key, preserving existing Firebase configuration. Removed blank Supabase overrides from `.env.local`. Nothing has been configured/deployed remotely.

# Supabase photo attachment changes (2026-11-05)

Implemented locally; no live deployments or billing changes. Prior workspace modifications are preserved.

- `src/config/photoStorage.ts`, `src/services/supabase.ts`: public config validation, lazy native Firebase-token Supabase client and trusted token/project prerequisite diagnostics.
- `src/services/photos.ts`, `src/services/photoQueue.ts`, `src/services/photoCleanup.ts`: SDK 58 JPEG compression <=2 MB, ArrayBuffer upload, private temporary signed URLs and per-UID best-effort orphan cleanup.
- `src/services/requestSubmission.ts`, `src/services/requests.ts`, `src/services/requestValidation.ts`, `src/types/index.ts`: upload-before-create, durable metadata, stable ID/idempotent retry, atomic request/history preservation, Pending-only changes and cleanup retry.
- `src/components/RequestForm.tsx`, `src/components/RequestDetails.tsx`, `src/components/RequestPhoto.tsx`, `src/components/PhotoCleanup.tsx`: camera/gallery/preview/remove/replace/cancel/retry/without-photo flow, accessible enlargement/loading/error/retry states.
- `src/contexts/AuthContext.tsx`: preserve the active profile listener and form during same-UID token refresh.
- `src/services/firebase.ts`, `src/services/errors.ts`: remove mobile Firebase Storage initialization and obsolete storage billing diagnostics.
- `firestore.rules`: bounded Supabase metadata validation; existing authorization, statuses, edits and private history protections retained. Complete copies refreshed in earlier setup/workflow documents.
- `supabase/storage.sql`: complete private bucket settings, protected string-UID enrollment tables and restrictive RLS policies.
- `functions/scripts/enroll-photos.cjs`: trusted workstation custom-claim enrollment; no Function deployment or privileged mobile key. Prints owner-only SQL matching the existing approved profile role.
- `.env.example`, `SUPABASE_PHOTOS_SETUP.md`, `PHOTO_STORAGE_STATUS.md`, README/BLOCKERS/checklists/test report: exact prerequisites, enrollment/revocation, publication and live acceptance steps.
- `package.json`, `package-lock.json`: SDK-compatible image manipulator/crypto, supabase-js and URL polyfill; PGlite is test-only development tooling.
- `tests/photo-availability.test.cjs`, `tests/supabase-policies.test.cjs`, `tests/student-history.test.cjs`, `tests/rules.test.cjs`, `tests/request-workflow.test.cjs`: actual-source unit and local PostgreSQL/Firebase rules verification.

See [TEST_REPORT.md](TEST_REPORT.md) for actual results and [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md) for all outstanding owner actions.

---

# Repair file inventory

These files were added or modified during this repair. Some were already untracked or modified on arrival; their prior contents are preserved in `.checkpoints/before-repair-20261104-204744`. Existing changes to `src/app/index.tsx`, `src/components/app-tabs.tsx`, and the existing ESLint config were retained. No accounts or collections were deleted or migrated.

## Setup and verification

- `.gitignore`
- `.env.example`
- `app.json`
- `package.json`
- `package-lock.json`
- `README.md`
- `BLOCKERS.md`
- `TEST_REPORT.md`
- `REQUIREMENTS_CHECKLIST.md`
- `ACCEPTANCE_CHECKLIST.md`
- `CHANGED_FILES.md`

## Firebase policy and tests

- `firebase.json`
- `firebase.rules`
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `tests/rules.test.cjs`
- `tests/filters.test.cjs`

## Routes

- `src/app/_layout.tsx`
- `src/app/dashboard.tsx`
- `src/app/login.tsx`
- `src/app/register.tsx`
- `src/app/report.tsx`
- `src/app/admin.tsx`
- `src/app/staff.tsx`
- `src/app/requests/[id].tsx`
- `src/app/edit/[id].tsx`
- `src/app/(student)/_layout.tsx`
- `src/app/(student)/home.tsx`
- `src/app/(student)/requests.tsx`
- `src/app/(student)/history.tsx`
- `src/app/(student)/profile.tsx`

## Services, state and types

- `src/config/firebase.ts`
- `src/contexts/AuthContext.tsx`
- `src/services/firebase.ts`
- `src/services/auth.ts`
- `src/services/authPersistence.ts`
- `src/services/authPersistence.native.ts`
- `src/services/requests.ts`
- `src/services/errors.ts`
- `src/services/photos.ts`
- `src/services/photoCleanup.ts`
- `src/services/notifications.ts`
- `src/services/notifications.native.ts`
- `src/hooks/useNetworkStatus.ts`
- `src/hooks/useRequests.tsx`
- `src/hooks/useRequest.ts`
- `src/hooks/use-color-scheme.web.ts`
- `src/types/index.ts`
- `src/utils/requestFilters.ts`
- `src/constants/theme.ts`

## Reusable native UI

- `src/components/AuthGate.tsx`
- `src/components/Management.tsx`
- `src/components/NotificationSettings.tsx`
- `src/components/PhotoCleanup.tsx`
- `src/components/RequestDetails.tsx`
- `src/components/RequestForm.tsx`
- `src/components/RequestList.tsx`
- `src/components/RequestTimeline.tsx`
- `src/components/app-tabs.web.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Choices.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/OfflineBanner.tsx`
- `src/components/ui/PriorityBadge.tsx`
- `src/components/ui/RequestCard.tsx`
- `src/components/ui/Screen.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/StatusBadge.tsx`

Generated local artifacts, excluded from Git: `.reference/` (proposal text, extracted references, portable tools, logs), `.checkpoints/` (reversible baseline), `dist/` (native exports). No native ios/android project folders were generated.

## Profile-completion follow-up files
Modified: src/services/auth.ts, src/services/firebase.ts, src/contexts/AuthContext.tsx, src/app/register.tsx, firestore.rules, tests/rules.test.cjs, TEST_REPORT.md, BLOCKERS.md, CHANGED_FILES.md.
Added: src/services/profile.ts, tests/fixtures/deployed-profile-read-only.rules, FIREBASE_PROFILE_FIX.md.
Existing firebase.json and firestore.indexes.json remain correctly wired and unchanged.


## Administrator registration and management files
Checkpoint: .checkpoints/admin-invitations-20261104-233054. Existing accounts/data were not migrated or deleted.

- src/app/accept-staff-invitation.tsx
- src/app/admin-profile.tsx
- src/app/admin-requests.tsx
- src/app/login.tsx
- src/app/register.tsx
- src/app/register-admin.tsx
- src/components/AdminRequestActions.tsx
- src/components/InvitationManager.tsx
- src/components/InvitationRegistration.tsx
- src/components/Management.tsx
- src/components/RegistrationTabs.tsx
- src/components/RequestDetails.tsx
- src/components/RequestTimeline.tsx
- src/contexts/AuthContext.tsx
- src/services/errors.ts
- src/services/firebase.ts
- src/services/invitations.ts
- src/services/profile.ts
- src/services/requests.ts
- src/services/userProfile.ts
- src/types/index.ts
- src/utils/requestFilters.ts
- functions/package.json
- functions/package-lock.json
- functions/src/index.cjs
- functions/src/provisioning.cjs
- functions/scripts/bootstrap-admin.cjs
- functions/test/provisioning.test.cjs
- firebase.json
- firestore.rules
- storage.rules
- package.json
- tests/rules.test.cjs
- tests/run-emulator-checks.cjs
- tests/filters.test.cjs
- tests/profiles.test.cjs
- FIREBASE_ADMIN_SETUP.md
- FIREBASE_PROFILE_FIX.md
- README.md
- BLOCKERS.md
- TEST_REPORT.md
- ACCEPTANCE_CHECKLIST.md
- CHANGED_FILES.md

## Simplified administrator registration — 2026-11-05

Local changes only; production remains unchanged.

- src/app/register-admin.tsx: three fields, one submit action, visibility toggle, loading/error handling, admin-profile-gated routing using the existing AuthContext.
- src/services/auth.ts: email/password registration and safe credential-authenticated retry, trusted callable, explicit server profile read/validation before completion. Student functions unchanged.
- src/services/errors.ts: authorization-service deployment/connection errors no longer refer to invitations.
- functions/src/provisioning.cjs and index.cjs: registerAdmin extends existing trusted provisioning using owner-only system/adminRegistration.emails; atomic profile/audit, preserved legacy data, no client role trust.
- firestore.rules: explicit denial for server-only configuration/audit; student and request permissions preserved. storage.rules unchanged; firebase.rules remains retired.
- Role-specific userProfile validation and AuthContext inspected: existing behavior already supports admin profiles without student-only fields, so no duplicate role system was added.
- tests/admin-registration.test.cjs, tests/rules.test.cjs, functions/test/provisioning.test.cjs, package.json: UI behavior and trusted allowlist/security tests.
- FIREBASE_ADMIN_SETUP.md: replaced stale admin invitation setup with exact Console allowlist/deployment instructions and full Firestore/Storage rules. Acceptance/blocker documentation updated.

## Callable deployment reporting and UID authorization repair — 2026-11-05

This section supersedes the prior email-only authorization instructions. Local source only; no live deployment, approval edit or billing change.

- .firebaserc: explicit default project fixquickproject. Inspected firebase.json: functions/ codebase quickfix-provisioning, Node 22. Client and backend both target registerAdmin/us-central1.
- functions/src/provisioning.cjs: replaces email-only approval with exact owner-approved Authentication UIDs in system/adminRegistration.approvedUids; never trusts request email/uid/role or obsolete emails configuration. Existing profiles/audits preserved.
- src/services/auth.ts: existing credentials sign in before account creation; provisioning retries preserve the same account. Missing callable error includes the actual runtime function/project/region and preserves the underlying error cause.
- src/services/firebase.ts: Functions included in shared Firebase-app identity validation. No student authentication changes or native dependency changes.
- functions/package.json: explicit build syntax checks for CommonJS backend.
- tests/admin-service.test.cjs and package.json: service-level existing-account retry, missing target, authorization and profile failure tests. Updated provisioning/rules tests cover trusted UID approval and email-only rejection.
- FIREBASE_ADMIN_SETUP.md: actual live endpoint/CLI findings, UID approval instructions, exact targeted deployment and confirmation commands, complete rules, billing/IAM prerequisites. Acceptance and blocker docs updated.

## Manual pending-admin registration without Cloud Functions — 2026-11-05

Supersedes earlier email/UID allowlist and callable-based admin registration descriptions. Local changes only; production data/rules/billing are unchanged.

- src/services/auth.ts: signs into existing accounts first, creates only missing pending-admin profiles, validates server persistence; removes the registerAdmin callable dependency.
- src/services/profile.ts: create-only pending_admin transaction, preserved existing roles/data, safe retries and identity checks.
- src/types/index.ts and src/services/userProfile.ts: pending_admin is a supported, non-privileged profile role without student-only field requirements.
- src/app/register-admin.tsx and new src/app/pending-admin.tsx: same three-field form; waiting message, explicit manual approval, refresh/signout, and routing when approved.
- src/components/AuthGate.tsx and src/hooks/useRequests.tsx: pending users are redirected to waiting screen and cannot subscribe/load global request feeds or cached administrator data. Existing AuthContext snapshot listener already handles Console role changes.
- firestore.rules: owner-bound pending profile creation allowed; active admin creation, role changes, approval flags and self-approval remain denied. Student/request/Storage protections preserved. firebase.rules remains retired.
- functions/src/index.cjs, provisioning.cjs and functions/test/provisioning.test.cjs: removed obsolete registerAdmin handler/export and UID-approval tests; separate legacy invitation tooling retained. No Functions deployment is needed for registration.
- src/config/photoStorage.ts, src/services/photos.ts and src/components/RequestForm.tsx: uploads explicitly unavailable; disabled before any upload/file/network request, selection hidden, text-only request management preserved. No provider replacement or photo-data migration.
- tests/admin-registration.test.cjs, admin-service.test.cjs, profiles.test.cjs, rules.test.cjs, new photo-availability.test.cjs, package.json: pending state, safe recovery, role restrictions, manual approval, live profile update and upload unavailability coverage.
- FIREBASE_ADMIN_SETUP.md: rewritten with exact manual Console role edit, rules-only publication and complete current Firestore/Storage rules. PHOTO_STORAGE_STATUS.md documents the separate Blaze blocker. Acceptance/blocker docs updated.

## Direct administrator workflow / five statuses — 2026-11-05

This section supersedes all earlier staff-assignment workflow descriptions. Existing unrelated work was retained; no production data/account/rule/index mutation was performed.

- src/types/index.ts: five canonical statuses plus an explicit Unknown status read state; new admin timestamps/UIDs, completion/rejection notes; assignment fields removed from the active interface. Legacy staff role is retained only for decoding inactive old accounts.
- src/constants/workflow.ts (new), badges.ts, src/utils/requestFilters.ts: exact transition matrix, all five palettes/filter values, Resolved-to-Finished normalization, neutral unknowns, status/note search; no assignment filter.
- src/services/requests.ts: explicit legacy decoding, create/edit/priority/status transactions with matching immutable history, admin actor/timestamps/notes, terminal restrictions; removed assignment/staff-query services. No newly written assignment fields; existing document extras preserved.
- src/components/RequestDetails.tsx: removed entire broken progress card and Assigned To card, containers and spacing; retained request details/evidence/reporter, completion/rejection cards, owner edit/delete only Pending.
- src/components/AdminRequestActions.tsx: direct Approve Request, Start Work, Mark Finished and Reject Request actions with required input; no staff prerequisite.
- src/components/RequestHistory.tsx (new): flat realtime event history with notes, canonical status badges, errors/cleanup. Deleted old RequestTimeline.tsx; no substitute progress tracker.
- src/components/Management.tsx, RequestList.tsx, ui/RequestCard.tsx, ui/StatusBadge.tsx and src/app/(student)/home.tsx: five status counts/filter/history/search, notes for owners, wrapping badges/headers, no assignment summaries/selectors/invitations.
- src/hooks/useRequests.tsx and useRequest.ts: only active student/admin roles subscribe; account/request identity guard, error handling, unsubscribe and late-callback protection. Existing shared feed drives Dashboard/My Requests/History; Details uses a document listener.
- src/components/AuthGate.tsx, app-tabs.tsx, src/app/dashboard.tsx, staff.tsx and accept-staff-invitation.tsx: legacy staff accounts stay stored but inactive, with no automatic promotion or active navigation/provisioning path. Old links redirect safely.
- Deleted unused mobile InvitationManager.tsx, InvitationRegistration.tsx and services/invitations.ts. src/services/firebase.ts no longer initializes Functions for the mobile workflow. Historical backend files are not deployed or needed by these changes.
- firestore.rules: exact transitions, admin identity/server timestamps/required notes, protected roles/manual approval, atomic bidirectional request-history linkage, immutable terminal records, owner-only student CRUD before review, no staff/assignment authorization. Legacy assignment extras stay inert and immutable.
- storage.rules: removed assignment-based staff read access. Uploads remain disabled and the billing blocker is unchanged.
- firestore.indexes.json: removed unused assignment index declaration; no new index/deployed index deletion is required.
- tests/rules.test.cjs: replaced obsolete assignment expectations with direct workflow, all transition pairs, actual client service, security/atomic rollback, live updates, manual approval, legacy compatibility and Storage protections; retained profile-recovery regression cases.
- tests/filters.test.cjs, badges.test.cjs, request-workflow.test.cjs (new), helpers/load-source.cjs (new), package.json: five-status filters/palettes, actual screen structure/action/notes checks, listener cleanup, legacy decoding and existing authentication tests.
- WORKFLOW_UPDATE.md (new), FIREBASE_ADMIN_SETUP.md, README.md, BLOCKERS.md, ACCEPTANCE_CHECKLIST.md, REQUIREMENTS_CHECKLIST.md and TEST_REPORT.md: complete current rules, exact publication steps, compatibility policy and actual verification. Physical-device screenshots/behavior and production publishing remain pending.

## Save Priority / Mark Finished denial follow-up — 2026-11-05

See ADMIN_OPERATIONS_FIX.md for the exact payloads, independently reproduced old request/history denials and COMPLETE final rules. Production rules were not deployed. Repaired src/services/requests.ts with transactional saved-admin checks before both operations/no-ops, identity checks, explicit priority validation and actionable permission errors preserving the cause. Student CRUD and manual admin approval remain unchanged. firestore.rules now has a separate priority-only branch and explicit nested history checks for admin actions, before/after values and matching completion/rejection notes. Added targeted regressions to tests/rules.test.cjs and the historical tests/fixtures/legacy-admin-operations.rules fixture; refreshed complete rule blocks in WORKFLOW_UPDATE.md and FIREBASE_ADMIN_SETUP.md. No records, roles or assignments were rewritten.

## Student dashboard index / raw listener diagnostics — 2026-11-05

- Inspected actual RequestsProvider dashboard query and getUserRequests: requests where ownerId == current UID, ordered by createdAt DESC. Exact ownerId ASC + createdAt DESC COLLECTION composite is already present in firestore.indexes.json. Retained both existing index definitions and fieldOverrides unchanged; no duplicate/speculative index was needed.
- Added src/services/firestoreDiagnostics.ts and integrated it in src/hooks/useRequests.tsx, useRequest.ts, src/components/RequestHistory.tsx and src/contexts/AuthContext.tsx. Development logs retain original SDK code/message/error object plus source/project/path/query before UI formatting; no transport overrides or rule changes.
- Added tests/firestore-diagnostics.test.cjs and test script entry; adjusted the existing detail-listener test's Firebase app mock for diagnostic context.
- FIRESTORE_INDEX_SETUP.md contains exact indexes-only CLI command, Console fields/directions/scope, evidence-based transport triage and remaining deployment/readiness steps.
- Typecheck/lint passed; 29 unit tests passed. No production deployment or live transport reproduction occurred. firestore.rules, storage.rules and Firebase network configuration remain untouched in this follow-up.

## Student edits and private history hiding — 2026-11-05

Local source/rules only; no production deployment or data mutation.

- src/services/requestValidation.ts (new): allowed edit fields, trimmed/length-checked text, category/priority validation and protected-field rejection.
- src/services/requests.ts: validated owner-Pending corrections, identity guard, atomic edit history and unchanged-save no-op. Existing admin operations remain intact.
- src/components/RequestForm.tsx, RequestDetails.tsx and src/app/edit/[id].tsx: prefilled edit fields, Edit icon, duplicate-submit lock, success/error feedback, View Saved Request and reviewed-request redirect. Photo availability restrictions retained.
- src/services/historyPreferences.ts (new): per-user terminal-request hide/restore transactions with account/role/owner/status checks. Only preference references are written/deleted; shared requests/audits/timestamps are untouched.
- src/hooks/useHistoryPreferences.ts (new): private per-account realtime subscription, server confirmation, identity guard, errors/retry and cleanup.
- src/components/HistoryEntries.tsx (new): student/admin History filtering only, individual confirmation, Undo, Show hidden entries/Restore and empty states; preserves status/category/search filters.
- src/components/RequestList.tsx: student History uses private HistoryEntries; operational lists remain on the unfiltered shared feed.
- src/app/admin-history.tsx (new) and src/components/Management.tsx: admin-only History route and navigation tab, without changing dashboard/operational data/counts.
- src/components/ui/Button.tsx: explicit accessible label from the existing button title for clear icon/text actions.
- firestore.rules: private users/{uid}/historyPreferences/{requestId} permissions, terminal/access validation, preserved role protection and owner-only Pending edits, exact expected audit-map matching and optimized linked history validation. No allow-all, staff assignment or Functions dependency.
- tests/student-history.test.cjs (new), request-workflow.test.cjs, rules.test.cjs and package.json: prefill/validation/duplicate UI saves, edit controls, full corrections/live admin view, protected/reviewed edits, hide/restore isolation, no shared mutations or count changes, listener cleanup and stale concurrent-write protection.
- STUDENT_EDIT_HISTORY.md (new): complete current rules, exact publication, schema and verification. Other current rule guides refreshed; acceptance/blocker/test reports updated. Existing index definitions and Storage implementation were preserved.
