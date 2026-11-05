# Current photo storage status

Updated 2026-11-05: private **Supabase Free** photo attachment code replaces the Firebase Storage implementation. Full setup and limitations: [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md).

- Firebase Authentication and Firestore remain in place; no Firebase Storage SDK initialization/read/upload remains in the mobile source.
- No billing upgrade, Functions deployment or Supabase project was created. No live bucket/policies/enrollments or Firestore rules were published.
- Missing Supabase URL/publishable key produces a clear unavailable message while photo-less requests stay usable.
- Owner setup requires native Firebase third-party auth configuration, a trusted generic token claim for each enrolled user, private student/admin UID membership, complete SQL and current Firestore rules.
- Local automated coverage is recorded in TEST_REPORT.md. A real student upload retrieved by the authorized admin and physical iPhone/Android runs are **still required**. Photos are not yet verified operational.
- Legacy Firebase photo fields/objects are preserved without migration. They show unavailable; no billing-dependent Firebase Storage access is attempted by this integration.

The earlier blocker was Firebase Storage's required Blaze plan. Supabase is the explicitly requested alternative; this does not make Firebase Storage work without its required plan. No existing Firebase files were silently copied or deleted.
