> Current workflow supersedes historical staff-assignment requirements below: only student/admin are active. See [WORKFLOW_UPDATE.md](WORKFLOW_UPDATE.md) for the five-status admin workflow, full rules, compatibility and test evidence. No production deployment or physical-device verification was performed.

# Repair checklist
References inspected: all seven proposal pages; all nine Stitch screen.png files; DESIGN.md and screen HTML. Login PNG has missing/black areas; use its HTML for missing composition. Admin reference has no HTML.
Checkpoint: .checkpoints/before-repair-* contains tracked.patch and copies of pre-existing untracked work.

| Requirement | Implementation files | Verification |
| --- | --- | --- |
| Persistent auth, errors, profile recovery, reset | services/firebase.ts, auth.ts, contexts/AuthContext.tsx, login/register, components/AuthGate.tsx | typecheck, bundle; real-account device acceptance pending |
| Native reference UI, Inter, accessible forms/tabs | constants/theme.ts, components/ui, screens, (student)/_layout.tsx | inspect references; native screenshot comparison pending device |
| Request CRUD, priorities, search/status, history | services/requests.ts, request screens | automated filter tests, emulator rules, device acceptance |
| Camera/gallery, validation, progress/cancel/retry, durable paths | services/photos.ts, request form/details | bundle, Storage emulator; physical upload pending billing/config |
| Admin assignment, staff resolution | management screens, requests service, rules | emulator permission tests; real role acceptance pending |
| Offline viewing and status notifications | hooks/useRequests.ts, network hook, cache, app banner | automated cache/filter tests; device airplane mode acceptance |
| Strict profiles/requests/Storage permissions | firestore.rules, storage.rules, firebase.json, tests | isolated demo-project emulator suite |
| Beginner Windows instructions, external setup | README.md, BLOCKERS.md, TEST_REPORT.md | exact commands and honest actual results |

