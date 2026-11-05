> Supabase photo update: local implementation and automated checks pass; live Supabase and physical-device acceptance remain unchecked. Follow the live checklist in [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md). Do not mark photos working until an authorized admin retrieves an actual student upload. Older Firebase-photo unavailable statements below are historical.

# iPhone and Android acceptance
Run every applicable row on a physical iPhone with Expo Go and on a physical Android with Expo Go. Record OS, Expo Go version, account role, result, and screenshots. Use authorized existing accounts; never provide passwords or private keys to the assistant.

| Scenario | iPhone | Android |
| --- | --- | --- |
| SDK 58 project opens; headers/safe areas/tabs match supplied PNGs | [ ] | [ ] |
| Small display and large text remain scrollable; keyboard does not hide fields/actions | [ ] | [ ] |
| Existing user logs in; email is trimmed and password remains unchanged | [ ] | [ ] |
| Wrong password shows credential error; no Firestore-rule changes are needed | [ ] | [ ] |
| Login omits the Forgot Password option while email/password login remains functional | [ ] | [ ] |
| Register a student; users/{uid} has the exact owner UID and student role | [ ] | [ ] |
| Simulated profile-write failure leaves an auth account; sign in and complete profile without recreating account | [ ] | [ ] |
| Existing privileged profile retains role; denied profile reads show retry/sign-out instead of fake success | [ ] | [ ] |
| Force-close/reopen Expo Go preserves login; logout prevents protected navigation | [ ] | [ ] |
| Edit profile name/location; role/email/ID remain protected | [ ] | [ ] |
| Create request with category, title, description, location and each priority | [ ] | [ ] |
| Request list and detail show actual server data and timestamps | [ ] | [ ] |
| Search by ID/category/title/location/description intersects status filters | [ ] | [ ] |
| Owner edits and deletes a pending request; other students cannot read/edit/delete it | [ ] | [ ] |
| Edit Request opens all six prefilled correction fields; duplicate Save presses create one atomic edit event and show success/errors | [ ] | [ ] |
| Reviewed requests lose edit controls; admin sees corrections live; ID/owner/creation/status/admin/evidence fields stay unchanged | [ ] | [ ] |
| Student and admin History offer confirmed Delete from my history only for Finished/Rejected entries | [ ] | [ ] |
| Private hiding leaves other history, shared timestamps/audits and dashboard/operational counts unchanged | [ ] | [ ] |
| Undo and Show hidden entries/Restore work after reload; empty/error/offline preference states are useful | [ ] | [ ] |
| Even admin cannot read/change another user's historyPreferences documents | [ ] | [ ] |
| Gallery selects image; camera permission allowed/denied paths are useful | [ ] | [ ] |
| Preview/removal/replacement work; unsupported/oversized image is rejected | [ ] | [ ] |
| Upload shows progress; cancel/failure retains selected photo and saved request ID | [ ] | [ ] |
| Retry uploads to the same request; no duplicate request is created | [ ] | [ ] |
| Real Storage object uses owner/request path and image metadata; no base64 in Firestore | [ ] | [ ] |
| If supported Storage is available: owner/admin retrieve photo; legacy staff and unrelated accounts are denied | [ ] | [ ] |
| Replace/remove photo; interrupted cleanup can be retried in Profile without deleting attached evidence | [ ] | [ ] |
| Admin approves Pending, starts Approved, finishes In Progress without any assignment | [ ] | [ ] |
| Admin rejects Pending/Approved with a reason; finishing requires completion notes | [ ] | [ ] |
| Finished/Rejected are terminal; invalid transitions/student status writes fail atomically | [ ] | [ ] |
| Student sees live saved status and completion/rejection text in Details and History | [ ] | [ ] |
| All five statuses work in dashboard counts, My Requests, History filters, badges and search | [ ] | [ ] |
| Resolved records display as Finished; unknown statuses never become Pending | [ ] | [ ] |
| Removed progress and Assigned To cards/containers and all assignment controls are absent | [ ] | [ ] |
| Legacy staff login preserves account but grants no request access or admin role | [ ] | [ ] |
| Enable local alerts; permission grant/denial and local delivery behave as documented | [ ] | [ ] |
| Airplane mode shows saved list/profile and stale label; writes require reconnecting | [ ] | [ ] |
| Reconnect refreshes data; logout/account switch never shows another account's cached requests | [ ] | [ ] |
| Loading, empty, permission-denied, network-failure and missing-request states are useful | [ ] | [ ] |

Capture each implemented screen and compare against the corresponding Stitch PNG. Login comparison also needs its HTML because the PNG has missing/black regions. Check card sizes, form widths, spacing, text hierarchy, blue/gray colors, status chips, icons, and tab placement.

For profile-write recovery use an authorized test account and temporarily scoped test rules in an emulator/test environment; do not delete existing production profiles. For billing/provider/App Check checks, follow BLOCKERS.md without weakening security to make a test pass.

Closed-app remote push, guaranteed background synchronization, guaranteed offline photo/timeline retrieval, and server-side orphan retention are outside the implemented Expo Go baseline.
## Current administrator/invitation acceptance
- [ ] Login has email/password and no visible Forgot Password action.
- [ ] Student/Admin registration tabs work on small iPhone and Android displays.
- [ ] Student registration and existing-account profile completion still work.
- [ ] Admin form has exactly Full Name, Email Address, Password, a password visibility toggle and one Create Admin Account submit button; no invitation or verification controls.
- [ ] With complete Firestore rules published, registration shows "Account created. Awaiting administrator approval." No Function call, billing, invitation or email verification is required. Pending accounts cannot open admin screens or data/actions.
- [ ] Owner manually changes users/{Authentication UID}.role from pending_admin to admin in Firebase Console; connected waiting screen receives approval and opens Admin Dashboard. Refresh Approval Status also reloads the profile.
- [ ] Existing valid Authentication credentials resume missing pending-profile setup without duplicate signup; existing student/staff/admin data and roles are not overwritten.
- [ ] Request form clearly reports photo upload unavailable and still submits/edits requests without photos; no unsupported Storage access is represented as working.
- [ ] Existing legitimate privileged roles remain; role refresh routes to the correct dashboard.
- [ ] Staff invitation/provisioning controls and navigation are absent from the active application.
- [ ] All five management filters intersect search; counts show actual requests.
- [ ] Administrator can view reporter details/available evidence, prioritize and approve/start/finish/reject directly.
- [ ] Priority and status changes save actor UID, before/after values and server timestamps atomically with history.
- [ ] Students cannot gain roles or access other students' requests; legacy staff have no active data access.
- [ ] Loading, denied, empty, offline, error and success states are readable; bottom navigation and keyboards respect safe areas.

Manual owner role approval and Firestore rules publication are external operator actions, not performed by this repair. Use FIREBASE_ADMIN_SETUP.md; earlier callable/allowlist/invitation admin setup instructions are superseded. Photo uploads remain unavailable until a supported storage solution is chosen and validated.
