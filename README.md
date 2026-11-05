> Supabase Free photo attachments are implemented locally. Follow [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md) for complete SQL, Firebase token enrollment, private bucket setup, admin revocation and complete Firestore rules. No live storage setup/deployment or physical-device photo retrieval has been verified. Older unavailable-photo descriptions below refer to the superseded Firebase Storage flow.

> Current admin registration uses Authentication + Firestore pending profiles and manual owner approval, without Cloud Functions or billing. See [FIREBASE_ADMIN_SETUP.md](FIREBASE_ADMIN_SETUP.md) for complete rules and the exact Console role edit. Photo uploads require the Supabase configuration and enrollment documented above; see [PHOTO_STORAGE_STATUS.md](PHOTO_STORAGE_STATUS.md). Production rules/approvals have not been changed.

# Quick Fix Project II
Expo SDK 58 / React Native / TypeScript / Expo Router. Uses the existing Firebase client project configuration for `fixquickproject`. Source repairs and automated checks do not prove that live Firebase Console settings or device behavior are correct.

## Start on Windows in VS Code
1. Open `C:\Projects\QuickFixProjectII` in VS Code.
2. Use Node.js 24 LTS and a PowerShell terminal. The test environment had Node 26; Firebase CLI dependencies warn that they support Node 20/22/24.
3. Install the locked dependencies:

```powershell
npm.cmd ci
```

4. The existing public Firebase client identifiers remain in `src/config/firebase.ts`. To override them, copy `.env.example` to `.env.local`, then use the exact config from the same existing Firebase web app. Never put admin credentials in EXPO_PUBLIC variables.
5. Complete the Firebase checklist in [BLOCKERS.md](BLOCKERS.md). Do not create a replacement project.
6. Start Expo:

```powershell
npx.cmd expo start --clear
```

Connect the phone and PC to the same network. Scan the QR code with iPhone Camera or Android Expo Go. The installed Expo Go must support SDK 58. If LAN access is blocked, check Windows Firewall and network isolation. No development build has been substituted for Expo Go.

## Checks
```powershell
npm.cmd run typecheck
npx.cmd expo lint
npm.cmd test
npx.cmd expo-doctor
npx.cmd expo install --check
npx.cmd expo export --platform ios --platform android --output-dir dist
```

Security tests require Java 21 on PATH:

```powershell
java -version
npm.cmd run test:rules
```

This command uses only the isolated `demo-quickfix` project and clears that emulator's test data, never production collections. A portable Java runtime and verified emulator JARs were downloaded into ignored `.reference` for this repair. To reuse them on this workstation:

```powershell
$env:JAVA_HOME=(Resolve-Path '.reference/java21/jdk-21.0.13+9-jre').Path
$env:PATH=$env:JAVA_HOME+'\bin;'+$env:PATH
$env:FIREBASE_EMULATORS_PATH=(Resolve-Path '.reference/emulators').Path
npm.cmd run test:rules
```

Do not edit rules while the emulator is starting. The scripts do not deploy rules.

## Application behavior
- Student edits and private history hiding: see [STUDENT_EDIT_HISTORY.md](STUDENT_EDIT_HISTORY.md) for current full rules and exact publication steps. Owners edit only Pending requests with atomic history; student/admin History hides individual Finished/Rejected entries privately with confirmation and Undo/Restore. Shared requests, audit records, timestamps and operational counts are preserved. Admin navigation now includes History.
- Students register, recover their profile, log in, report/edit/delete their own Pending requests, search/filter all five statuses and view live notes/history. Photos require the Supabase setup above.
- Student registration creates student profiles; Admin Registration creates non-privileged pending_admin profiles, manually approved by the project owner in Console. Existing roles/data are preserved. Legacy staff accounts have no active workflow access and are never promoted automatically.
- Administrators directly approve Pending requests, start Approved work, finish In Progress work with completion notes, or reject Pending/Approved requests with a reason. Finished/Rejected are terminal. Status and immutable history are saved atomically, without assignment. See [WORKFLOW_UPDATE.md](WORKFLOW_UPDATE.md) for complete rules and exact publishing steps.
- The removed progress/assignment cards and all staff selectors, invitation controls, assignment summaries/filters and staff navigation are absent. Resolved records display as Finished; unknown statuses remain explicit and locked for owner review.
- Photo uploads are currently unavailable: Firebase Storage requires Blaze, and billing is not enabled by this repair. Text-only requests remain supported. Existing `photoPath`/URL data is preserved; the retained Storage implementation uses authenticated reads and owner/request paths, but live photo access is not claimed.
- Profile > Clean Up Unused Photos retries tracked uploads/replacements/deletions that were interrupted. It checks current request references; Storage rules reject deletion of attached evidence. Retry after restoring connectivity. Queues are scoped to the signed-in user and retained across sign-out.
- Request history is appended with request writes. Older requests can lack history entries. Deleted parents retain inaccessible append-only history documents; any retention purge belongs in a trusted backend, not client-wide deletion.
- One shared request listener drives screens and status notifications. Saved profiles and lists use account-scoped AsyncStorage, with stale/offline labels. Sign-out clears profile/list caches. No offline writes or queued photo uploads are promised.
- Profile and management screens offer opt-in local status alerts. These are generated when the running app detects a status change. Closed-app remote push and background synchronization are not configured. Notification permission denial does not block in-app status updates.
- HEIC images must be converted to JPEG/PNG/WebP before upload. Photos and timelines are not promised to be available offline after a cold restart.

## Deployment
Read [BLOCKERS.md](BLOCKERS.md) first. Only after confirming the existing project's schema and Console settings, a project administrator can run:

```powershell
npx.cmd firebase login
npx.cmd firebase projects:list
npx.cmd firebase deploy --project fixquickproject --only firestore:rules
```

Review the selected project before executing deployment. No new index is needed. If an existing Storage bucket is available on a supported plan, separately publish its updated rules with `npx.cmd firebase deploy --project fixquickproject --only storage` to remove legacy staff access. Uploads remain unavailable; do not enable billing for this workflow. `firebase.json` separates `firestore.rules` from `storage.rules`; the former combined `firebase.rules` is a retirement notice and must not be pasted into either Console editor. See WORKFLOW_UPDATE.md for the complete current rules.

Read [TEST_REPORT.md](TEST_REPORT.md) for actual checks and [ACCEPTANCE_CHECKLIST.md](ACCEPTANCE_CHECKLIST.md) for physical-device testing. [CHANGED_FILES.md](CHANGED_FILES.md) lists repair files. A reversible checkpoint of pre-existing changes is in `.checkpoints/before-repair-20261104-204744` (tracked patch plus copies of pre-existing untracked files).
