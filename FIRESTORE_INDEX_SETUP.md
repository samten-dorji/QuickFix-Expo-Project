# Student dashboard index and Listen diagnostics

Updated 2026-11-05 (Asia/Dhaka). Local source inspection/tests only. No indexes/rules/Functions were deployed and no billing setting was changed.

## Exact query and index

The dashboard uses the shared RequestsProvider in src/hooks/useRequests.tsx. Its executed student query is:

```ts
query(collection(db, 'requests'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'))
```

src/services/requests.ts:getUserRequests uses the same constraints. The required composite index is ALREADY PRESENT in firestore.indexes.json; no duplicate or speculative index was added. Both existing definitions and fieldOverrides were preserved unchanged:

| Purpose | Collection ID | Scope | First field | Second field |
| --- | --- | --- | --- | --- |
| Required student dashboard/feed | requests | Collection / COLLECTION | ownerId — Ascending | createdAt — Descending |
| Existing definition preserved | requests | Collection / COLLECTION | status — Ascending | createdAt — Descending |

The current status/priority/category/search filters run locally over the permitted feed; they do not add Firestore where clauses. Admin feed orders only by createdAt descending. Request History orders only by createdAt ascending inside requests/{id}/history. Those single-field queries/document reads need no additional composite. No assignment index or collection-group index is used.

The local index declaration does not establish that the remote index exists or has finished building in fixquickproject. The earlier missing-index error is consistent with an undeployed/building index; the remote index inventory/build status was not inspected here.

## Deploy ONLY indexes

From PowerShell, with a Firebase CLI account authorized to manage this project's indexes:

```powershell
Set-Location C:\Projects\QuickFixProjectII
npx.cmd firebase login --reauth
npx.cmd firebase deploy --project fixquickproject --only firestore:indexes
```

The last command is the exact indexes-only deployment. firebase.json points at firestore.indexes.json. Do not replace the filter with firestore (which also includes rules), functions, storage or an unfiltered deploy. This operation does not require enabling billing or deploying Functions. No rule edit is needed for a missing-index error. Preserve unrelated remote indexes if the CLI offers to remove definitions not present locally; this repair requires no index deletions.

## Manual Firebase Console creation

1. Select project **fixquickproject**.
2. Firestore Database > default database > **Indexes** > **Composite** > **Add Index/Create Index**.
3. Collection ID: **requests**. Query scope: **Collection**, not Collection group.
4. Add fields in this order: **ownerId / Ascending**, then **createdAt / Descending**.
5. Create and wait until the index finishes building and is ready/enabled. Then retry/refresh the dashboard.
6. Preserve the existing **status / Ascending + createdAt / Descending** Collection-scope index. If recreating the entire local index set manually, create that second definition separately with collection ID requests and the same Collection scope. Do not create duplicate definitions if they already exist.

Firestore manages the implicit document-name (__name__) index suffix; no explicit extra field is required in this file or for the manual definition. A missing-index error normally includes an exact Console creation link: the new development diagnostics preserve it verbatim. Review that link's project/query before creating anything.

## Listen transport investigation

Inspected src/services/firebase.ts: it uses getFirestore(app) with default SDK transport settings. No forced long polling, stream override, network enable/disable workaround or suppression of SDK warnings was introduced. Saved top-level .reference logs contained no matching mobile WebChannelConnection / transport errored / RPC Listen stream warning trace. Emulator Java listener/permission errors are not evidence of the mobile transport issue. The warning could not be reproduced in a live device/client session here, so it is not claimed fixed.

New src/services/firestoreDiagnostics.ts logs raw listener failures in development before UI formatting. Request feed, request details, request history and user-profile listeners include their source, actual runtime project, path/query, ORIGINAL error code, ORIGINAL error message and ORIGINAL error object. The index creation URL and any SDK error details remain intact. Production logging is disabled by __DEV__; the SDK's own transport warnings remain untouched.

| Logged evidence | Interpretation / next action |
| --- | --- |
| failed-precondition + "query requires an index" and creation link | Verify/deploy the exact index in the logged project; wait for build completion; retry |
| permission-denied | A separate role/security-policy problem; an index deployment cannot grant access |
| unavailable, deadline-exceeded, or an explicit network message | Capture/reproduce connectivity behavior after the index is ready; compare the actual runtime network before considering transport changes |
| Generic Listen transport warning alone | Insufficient evidence to identify missing index versus permission versus network failure; correlate SDK warning time with the raw callback logs |

A retryable SDK transport warning may not trigger a terminal onSnapshot error callback. Existing SDK warnings are not intercepted; keep the original warning alongside callback logs if it persists. No network setting should be changed solely because an index was missing. If the warning remains after index readiness/retry, record the raw log, runtime platform/SDK, connectivity state and reproduction conditions; those are still outstanding for a transport-specific diagnosis.

## Verification and remaining external work

- npm.cmd run typecheck: passed.
- npm.cmd run lint: passed.
- npm.cmd test: 29 passed, 0 failed. New tests execute the dashboard's actual query builder and compare it with the declared composite, assert the existing status index remains, and verify original missing-index/permission/network codes/messages/error-object identity are logged in development and not production.
- Emulator tests are not a substitute for production composite-index readiness; the emulator does not enforce all production composite-index requirements. No emulator or live-deployment success is claimed for this task.
- Remaining: owner index deployment/manual creation, remote build readiness, then dashboard retry on the actual client and collection of any persistent transport warning. No security rules, index definitions, network configuration, account data or billing settings were changed.

References: [Firebase index management](https://firebase.google.com/docs/firestore/query-data/indexing), [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen).
