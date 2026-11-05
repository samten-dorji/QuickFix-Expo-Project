> Current rules supersede the historical rule block below. Publish the COMPLETE current [firestore.rules](firestore.rules) / [WORKFLOW_UPDATE.md](WORKFLOW_UPDATE.md) for the student/admin workflow and pending-admin approval.

# Profile completion and privileged registration
The earlier profile-permission repair remains active: student completion uses a create-only transaction at users/{uid}, waits for Auth readiness, preserves existing profiles/roles, and shows permission/retry errors.

The current role-specific architecture now also supports admin/staff profiles provisioned only by the trusted invitation backend. **Use [FIREBASE_ADMIN_SETUP.md](FIREBASE_ADMIN_SETUP.md) for the complete current Firestore/Storage rules, fields, indexes, deployment and first-admin instructions.** The old embedded student-only rules have been retired from this guide to avoid publishing stale policy.

No production rules were deployed. Student profile completion still needs no composite index. Existing profiles and known legacy student fields on privileged profiles are preserved. The original reported owner-GET-only deployed rule cannot create a profile; publish the current complete rules in the verified existing project.

Historical guides/source are retained in the local .checkpoints directories.

