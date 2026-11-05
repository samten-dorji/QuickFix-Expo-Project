> Latest photo status: Firebase generic photo-auth claims are confirmed for admin bJNIgzMg7ife1vg1DmxTEzZ0Jww1 and student l5C4XFg3PeQqvDweTUxfMINvZd23, preserving their existing roles. Supabase owner access is unavailable; run storage.sql then enroll-photo-users.sql in Supabase SQL Editor. Live policies/integration, production rule publication and upload/admin retrieval remain unverified. Older statements below about no remote changes predate this confirmed claim provisioning.

> Photo configuration repair: changed the required private bucket to `request-photos` in source, SQL, rules, tests and setup documentation. Created the actual ignored root `.env` using the user-supplied Supabase Project URL and publishable key, preserving existing Firebase configuration. Removed blank Supabase overrides from `.env.local`. Nothing has been configured/deployed remotely.

> Current photo blocker: owner Supabase project setup, Firebase third-party auth claim/UID enrollment, SQL publication and Firestore rules publication are outstanding. See [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md). No live upload/admin retrieval or physical-device verification has occurred. Older Firebase photo blockers below are historical; billing was not enabled.

> Current request workflow: see [WORKFLOW_UPDATE.md](WORKFLOW_UPDATE.md). Staff assignment is retired; admins approve/start/finish/reject directly. Only current Firestore/Storage rule blocks should be published; older documentation is historical.

> Current admin registration requires NO billing or Cloud Functions: publish the complete Firestore rules in [FIREBASE_ADMIN_SETUP.md](FIREBASE_ADMIN_SETUP.md), register a pending profile, then the project owner manually changes users/{uid}.role from pending_admin to admin in Firebase Console. Approval is manual. Earlier callable/email/UID-allowlist instructions are superseded. Production rules/approvals have not been changed. Photo uploads remain unavailable due to Firebase Storage's Blaze prerequisite; see [PHOTO_STORAGE_STATUS.md](PHOTO_STORAGE_STATUS.md).

# External Firebase and device checklist
No production settings, billing, rules, accounts, or collections were changed by this repair. Do not delete existing data to make tests pass.

## Confirm the existing project and schema
- Open Firebase Console and select project **fixquickproject**. Under Project settings > General, confirm the web app ID `1:559998958147:web:a40fd536fb212dba0672f6` belongs to this project. Compare all public identifiers with `src/config/firebase.ts` and `.env.example`.
- Supported override names: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`. Restart Expo after changes. Empty required values produce a startup error.
- Firestore uses the default database, `users/{uid}`, `requests/{id}`, and `requests/{id}/history/{eventId}`. Compare representative existing records with `src/types/index.ts` and `firestore.rules` before deployment. Preserve authorized roles. No migration has been run.
- Profiles use uid, email, displayName, studentId, hostel, roomNumber, role, createdAt, updatedAt. Dates are Firestore timestamps. Public creation allows only student. Approved profile edits are name and location.
- Requests use the fields in `src/types/index.ts`; categories include plumbing, electrical, HVAC, furniture, room and other. Roles/statuses/priorities are case-sensitive as defined there. Query indexes are in `firestore.indexes.json`.
- The original Android archive has local ZIP headers but no readable central directory, and no source/config files could be recovered. Consequently, its schema and Firebase config could not be verified. The implementation preserves the existing workspace conventions instead of guessing a legacy migration.

## Authentication versus profile errors
- Authentication > Sign-in method: confirm Email/Password is enabled.
- Authentication > Users: confirm existing accounts belong to this same project. Use the app's password reset flow for forgotten passwords; database rules cannot repair invalid credentials.
- If API key restrictions were configured in Google Cloud Console, confirm they permit the intended Firebase Authentication client use. Never remove all restrictions merely to hide a project mismatch.
- A signed-in user must be allowed to read their own profile. An account may exist even if its profile write failed: sign in, then use Complete Profile; never repeatedly create the account.
- Deploy the validated profile rules to allow tightly validated creation and approved updates. Do not use an authenticated-owner get-only diagnostic rule as the final policy.
- Admin registration creates only pending_admin; only the project owner edits users/{uid}.role to admin in Console. Only student/admin are active application roles. Legacy staff accounts are preserved but inactive, not promoted. Staff invitation/provisioning controls have been removed.
- App Check > APIs: inspect enforcement and request metrics for Firestore/Storage. App Check credentials are not configured in this Expo Go client. If enforcement requires unsupported native attestation, the project owner must decide on a supported test/production integration. This repair did not silently disable enforcement or switch to a development build.

## Storage is a separate operation
- Firebase Storage access now requires a Blaze pay-as-you-go billing plan under Firebase's announced rollout. Enabling billing can incur charges; review pricing and set budget alerts before choosing to enable it. No billing credentials are needed by this app or this assistant. See [Firebase's billing notice](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
- Storage > Files: verify the exact existing bucket. The workspace value is `fixquickproject.firebasestorage.app`; it is preserved, not confirmed remotely. Copy the actual Console bucket into `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` if different. Never guess an appspot.com/firebasestorage.app suffix.
- Verify that Storage has been initialized and is available under the project's billing/quota state.
- If a supported Storage bucket is already in use, publish updated `storage.rules` to remove legacy staff photo access. These rules inspect request ownership and admin roles, with no assignment dependency. This does not remove the billing blocker or enable uploads.
- New uploads use durable paths and authenticated reads. Old documents with `photoUrl` still display their existing URL for compatibility. Pre-existing bearer download URLs/tokens remain outside the protection of new client code; a trusted administrator must review/revoke legacy tokens if stronger protection is required. No legacy photos are automatically deleted.
- Unused-photo cleanup can retry paths tracked on this device. An app uninstall/cleared local storage can lose that cleanup queue; guaranteed server-side orphan collection requires a trusted backend retention job, which has not been deployed.

## Deploy only after these checks
Use the exact commands in README. The emulator tests target `demo-quickfix`. Deployment must explicitly target the confirmed existing project; it was not performed here.

## Device and visual verification still required
Physical iPhone/Android devices, live account credentials, Firebase Console access, billing, and production schema were not available for live acceptance in this session. No native simulator/screenshot renderer was available. All nine supplied PNGs and their available HTML were inspected, but visual equivalence has not been established by device screenshot comparison. The login PNG has mostly black/missing areas; its HTML supplies missing composition. The admin reference contains only a PNG.

Dependencies installed successfully. npm reported 37 dependency audit findings (32 moderate, 5 high), including development tooling; no forced major-version audit update was applied. Review an up-to-date npm audit before release. Node 24 LTS is recommended for the Firebase CLI dependency engine range.

## Confirmed profile-write blocker
The earlier owner-GET-only policy reported by the user denies profile creation. Source changes cannot override deployed rules. Follow WORKFLOW_UPDATE.md / FIREBASE_ADMIN_SETUP.md to publish the COMPLETE current Firestore rules, then retry using the existing Authentication account. No profile index is needed. No production deployment was performed.


Current dashboard index deployment and Listen diagnostics: see FIRESTORE_INDEX_SETUP.md. The exact required composite is already declared locally; production deployment/readiness still requires the project owner. No rule or transport setting change is needed for a missing-index error.
Student edits and private history hiding require the complete current firestore.rules, including users/{uid}/historyPreferences/{requestId}. See STUDENT_EDIT_HISTORY.md for publication. Source implementation is complete; production rules and device acceptance remain external. No new index, billing or Functions is required.
