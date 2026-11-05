> Photo attachment update: see [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md). Private Supabase photos are implemented locally; owner configuration, enrollment, rules publication and live retrieval tests remain required. Earlier disabled-Firebase-photo instructions are historical.

# Direct administrator maintenance workflow

Updated 2026-11-05 (Asia/Dhaka). This replaces the earlier staff-assignment workflow. All changes are LOCAL; no production rules, indexes, accounts or records were changed.

## Active roles and workflow

Only students and approved admins participate in maintenance work. `pending_admin` is a non-privileged registration state. Old `staff` profiles remain stored and can still authenticate, but the application shows an inactive-account explanation; they cannot read/manage requests through the updated rules and are never automatically promoted. Old /staff and staff-invitation links redirect to the dashboard gate. Staff selectors, invitations, assignment filters and assignment summaries have been removed from the mobile application. Historical backend invitation tooling is not loaded by the client and is not required or deployed for this update.

| Before | Admin action | After | Required input |
| --- | --- | --- | --- |
| Pending | Approve Request | Approved | None |
| Approved | Start Work | In Progress | None |
| In Progress | Mark Finished | Finished | Completion Notes, 1–4000 non-whitespace characters |
| Pending or Approved | Reject Request | Rejected | Rejection Reason, 1–4000 non-whitespace characters |

Finished and Rejected are terminal: no reopening, reprioritizing, student editing or deletion. Students may edit/delete only their own Pending requests; edits also record history. No action requires assignment. New status actions save statusChangedBy/statusChangedAt plus the corresponding approvedBy/approvedAt, startedBy/startedAt, finishedBy/finishedAt or rejectedBy/rejectedAt. The actor is the authenticated admin UID; timestamps are Firestore server timestamps.

Every create/edit/priority/status write includes lastEventId and its one matching history event in the same batch/transaction. Rules require the matching action, before/after status, priority, actor, timestamp and completion/rejection text. A failed request write leaves no history event; orphan or forged history writes are denied. History is immutable.

## Student screens and removed UI

Dashboard, My Requests, Maintenance History and Details use the same decoded realtime request feed/document. They show all five statuses. History now allows all five status filters rather than silently excluding active/rejected requests. Search includes saved status and completion/rejection text. The owner sees notes/reasons in Details and History. Request History is a flat saved-event list with realtime cleanup/error handling, not a progress tracker.

The entire top Submitted/Assigned/In Progress/Resolved progress card, its spacing, and the Assigned To/Awaiting assignment card were removed. No substitute progress card was added. Remaining details retain header/status, issue, location, priority, available legacy evidence, reporter information, notes/reasons and history. Header/cards wrap on narrow widths and use the shared Stitch styling/components. Native device layout still needs acceptance testing.

## Explicit legacy compatibility

The known old source wrote request statuses Pending, In Progress and Resolved. Assigned/Submitted were history action labels, not proof of approval statuses. No authenticated production data inventory was available; compatibility is based on workspace schemas/tests, not a claim about every live record.

- Saved Resolved displays/filters/counts as **Finished**. Original resolutionNotes/resolvedAt are read as completionNotes/finishedAt when newer fields are absent. These completed records remain terminal and are not rewritten.
- Existing In Progress records may finish directly with completion notes; they do not need retroactive approval or assignment.
- Known status spelling variants (case/whitespace and inProgress/in_progress/in-progress) normalize consistently for display and allowed old-state transitions. New actions always save the exact five canonical labels.
- Assigned, Submitted, arbitrary strings and missing status are **Unknown status**, never Pending. They remain visible under All and Total; Details displays the raw saved value. They have no workflow/edit actions until the project owner reviews/corrects that specific record in Console based on evidence.
- Legacy assignedStaffId/assignedStaffName, resolution fields and unrelated extra keys are preserved on existing documents but are not used for validation, authorization, actions or queries. New requests do not write assignment fields. Updates validate the core schema and narrowly allowed changed fields without requiring newly introduced optional fields on older documents.
- Existing Pending/In Progress records missing all new workflow fields can be updated directly, as covered by emulator tests. No destructive data migration, bulk status rewrite, account deletion or staff promotion is performed.

## Manual admin approval is unchanged

Register name/email/password to create users/{Authentication UID} with role pending_admin. The project owner verifies the intended account and changes that exact document's string role from pending_admin to admin in Firebase Console. Keep all other fields. The existing profile listener/Refresh Approval Status loads approval and routes to the Admin Dashboard. No billing, verification email, invitation, custom claim, allowlist or Cloud Function is required. See FIREBASE_ADMIN_SETUP.md.

## Exact publication steps

Publish the client and security rules together; the old client uses a retired workflow and its status writes will be rejected by the new rules.

1. Firebase Console > project **fixquickproject** > Firestore Database > default database > Rules.
2. Paste the ENTIRE Firestore block below (identical to firestore.rules), replacing the old editor content; click **Publish**. firebase.rules is retired and must not be pasted.
3. If an existing Storage bucket is in use and its rules are accessible, separately publish the ENTIRE Storage block in Storage > Rules. This removes assignment-based staff photo access; it does not eliminate Storage's billing prerequisite.
4. Restart/update the app and validate using approved test accounts. Nothing was published by this session.

Optional PowerShell for authenticated project owners:

```powershell
Set-Location C:\Projects\QuickFixProjectII
npx.cmd firebase login --reauth
npx.cmd firebase deploy --project fixquickproject --only firestore:rules
npx.cmd expo start --clear
```

If Storage is already available on a supported plan, publish its updated rules separately:

```powershell
npx.cmd firebase deploy --project fixquickproject --only storage
```

Do not enable billing or deploy Functions for this workflow. No new request index is required: students query ownerId + createdAt and admins query createdAt; status filtering is local over that permitted feed. firestore.indexes.json no longer declares the unused assignment index. Existing deployed assignment indexes can safely remain; no index deletion is required to use this change.

## Photo availability

Photo upload stays unavailable pending a supported storage choice; text-only requests work. The configured Firebase Storage bucket requires Blaze, and no billing/provider change occurred. Existing photo fields remain untouched; live photo access is not claimed. Emulator Storage tests prove permissions only, not plan availability. See PHOTO_STORAGE_STATUS.md.

## Complete Firestore rules

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signed() { return request.auth != null; }
    function role() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function admin() { return signed() && role() == 'admin'; }
    function text(value, maximum) { return value is string && value.size() > 0 && value.size() <= maximum; }
    function profileText(value, maximum) { return text(value, maximum) && !value.matches('\\s*'); }
    function profileValid(d) {
      return d.keys().hasAll(['uid','email','displayName','role','createdAt','updatedAt'])
        && d.keys().hasOnly(['uid','email','displayName','studentId','hostel','roomNumber','role','createdAt','updatedAt'])
        && profileText(d.displayName,120)
        && profileText(d.uid,128) && profileText(d.email,320)
        && d.role in ['student','staff','admin','pending_admin']
        && (d.role != 'student' || (profileText(d.studentId,120) && profileText(d.hostel,120) && profileText(d.roomNumber,120)))
        && d.createdAt is timestamp && d.updatedAt == request.time;
    }
    // Owner-only configuration and server-written audit; never accessible to clients.
    match /system/{document} { allow read, write: if false; }
    match /roleAudit/{document} { allow read, write: if false; }
    match /users/{uid} {
      allow get: if signed() && (request.auth.uid == uid || admin());
      allow list: if false;
      allow create: if signed() && request.auth.uid == uid && profileValid(request.resource.data)
        && request.resource.data.uid == uid && request.resource.data.email == request.auth.token.email
        && request.resource.data.role in ['student','pending_admin'] && request.resource.data.createdAt == request.time;
      allow update: if signed() && request.auth.uid == uid && profileValid(request.resource.data)
        && request.resource.data.uid == uid
        && (resource.data.role == 'student'
          ? request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName','hostel','roomNumber','updatedAt'])
          : request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName','updatedAt']));
      match /historyPreferences/{requestId} {
        function ownPreferences() { return signed() && request.auth.uid == uid && role() in ['student','admin']; }
        function permittedTerminalRequest() {
          let target = get(/databases/$(database)/documents/requests/$(requestId)).data;
          return state(target.status) in ['Finished','Rejected'] && (admin() || (role() == 'student' && target.ownerId == request.auth.uid));
        }
        allow read: if ownPreferences();
        allow create, update: if ownPreferences() && permittedTerminalRequest()
          && request.resource.data.keys().hasAll(['requestId','hidden','updatedAt'])
          && request.resource.data.keys().hasOnly(['requestId','hidden','updatedAt'])
          && request.resource.data.requestId == requestId && request.resource.data.hidden == true
          && request.resource.data.updatedAt == request.time;
        // Restore only deletes the caller's private reference, even if its request no longer exists.
        allow delete: if ownPreferences();
      }
    }
    // Read compatibility is explicit; unknown states never become Pending.
    function state(value) {
      return value in ['Pending','Approved','In Progress','Finished','Rejected'] ? value
        : value == 'Resolved' ? 'Finished'
        : !(value is string) ? 'Unknown'
        : value.lower().matches('\\s*pending\\s*') ? 'Pending'
        : value.lower().matches('\\s*approved\\s*') ? 'Approved'
        : value.lower().matches('\\s*in[ _-]*progress\\s*') ? 'In Progress'
        : value.lower().matches('\\s*(finished|resolved)\\s*') ? 'Finished'
        : value.lower().matches('\\s*rejected\\s*') ? 'Rejected' : 'Unknown';
    }
    // Durable private Supabase metadata. Signed URLs never belong in request documents.
    function photoValid(d,id) {
      let p = d.get('photo',null);
      return p == null || (p is map
        && p.keys().hasAll(['provider','bucket','path','mimeType','size','width','height'])
        && p.keys().hasOnly(['provider','bucket','path','mimeType','size','width','height'])
        && p.provider == 'supabase' && p.bucket == 'request-photos' && p.mimeType == 'image/jpeg'
        && p.path is string && p.path.split('/').size() == 4
        && p.path.split('/')[0] == 'requests' && p.path.split('/')[1] == d.ownerId && p.path.split('/')[2] == id
        && p.path.split('/')[3].matches('[a-zA-Z0-9-]+[.]jpg')
        && p.size is int && p.size > 0 && p.size <= 2097152
        && p.width is int && p.width > 0 && p.width <= 1600
        && p.height is int && p.height > 0 && p.height <= 1600
        && d.get('photoUrl',null) == null && d.get('photoPath',null) == null);
    }
    function requestValid(d,id) {
      return d.keys().hasAll(['id','ownerId','category','title','description','hostel','roomNumber','priority','status','createdAt','updatedAt'])
        && d.id == id && text(d.ownerId,128)
        && d.category in ['electrical','plumbing','hvac','furniture','room','other']
        && text(d.title,160) && text(d.description,4000) && text(d.hostel,120) && text(d.roomNumber,120)
        && d.priority in ['Low','Medium','High'] && state(d.status) != 'Unknown'
        && (d.get('photoPath',null) == null || (d.photoPath is string && d.photoPath.matches('requests/' + d.ownerId + '/' + id + '/[^/]+')))
        && photoValid(d,id) && d.createdAt is timestamp && d.updatedAt == request.time;
    }
    match /requests/{id} {
      function readable(d) { return signed() && (admin() || (role() == 'student' && d.ownerId == request.auth.uid)); }
      allow get: if signed() && role() in ['student','admin'] && !exists(/databases/$(database)/documents/requests/$(id));
      allow read: if readable(resource.data);
      function auditMatches(previousStatus, previousPriority, action, notes) {
        let eventId = request.resource.data.get('lastEventId','');
        let event = getAfter(/databases/$(database)/documents/requests/$(id)/history/$(eventId)).data;
        let expected = {
          'actorId': request.auth.uid, 'createdAt': request.time,
          'status': request.resource.data.status, 'previousStatus': previousStatus,
          'priorityBefore': previousPriority, 'priorityAfter': request.resource.data.priority,
          'action': action, 'notes': notes
        };
        return text(eventId,128) && (!exists(/databases/$(database)/documents/requests/$(id)) || eventId != resource.data.get('lastEventId',''))
          && !exists(/databases/$(database)/documents/requests/$(id)/history/$(eventId))
          && event == expected;
      }
      allow create: if signed() && role() == 'student' && requestValid(request.resource.data,id)
        && request.resource.data.keys().hasOnly(['id','ownerId','category','title','description','hostel','roomNumber','priority','status','photo','photoUrl','photoPath','completionNotes','rejectionReason','createdAt','updatedAt','lastEventId'])
        && request.resource.data.ownerId == request.auth.uid && request.resource.data.status == 'Pending'
        && request.resource.data.get('photoUrl',null) == null && request.resource.data.get('photoPath',null) == null
        && request.resource.data.get('completionNotes',null) == null && request.resource.data.get('rejectionReason',null) == null
        && request.resource.data.createdAt == request.time && auditMatches(null,null,'Submitted',null);
      function transition() {
        let before = state(resource.data.status);
        let after = request.resource.data.status;
        let changed = request.resource.data.diff(resource.data).affectedKeys();
        return request.resource.data.statusChangedBy == request.auth.uid && request.resource.data.statusChangedAt == request.time
          && (
            (before == 'Pending' && after == 'Approved'
              && changed.hasOnly(['status','statusChangedBy','statusChangedAt','approvedBy','approvedAt','lastEventId','updatedAt'])
              && request.resource.data.approvedBy == request.auth.uid && request.resource.data.approvedAt == request.time
              && auditMatches(resource.data.status,resource.data.priority,'Approved',null))
            || (before == 'Approved' && after == 'In Progress'
              && changed.hasOnly(['status','statusChangedBy','statusChangedAt','startedBy','startedAt','lastEventId','updatedAt'])
              && request.resource.data.startedBy == request.auth.uid && request.resource.data.startedAt == request.time
              && auditMatches(resource.data.status,resource.data.priority,'Started',null))
            || (before == 'In Progress' && after == 'Finished'
              && changed.hasOnly(['status','statusChangedBy','statusChangedAt','finishedBy','finishedAt','completionNotes','lastEventId','updatedAt'])
              && request.resource.data.finishedBy == request.auth.uid && request.resource.data.finishedAt == request.time
              && profileText(request.resource.data.completionNotes,4000)
              && auditMatches(resource.data.status,resource.data.priority,'Finished',request.resource.data.completionNotes))
            || (before in ['Pending','Approved'] && after == 'Rejected'
              && changed.hasOnly(['status','statusChangedBy','statusChangedAt','rejectedBy','rejectedAt','rejectionReason','lastEventId','updatedAt'])
              && request.resource.data.rejectedBy == request.auth.uid && request.resource.data.rejectedAt == request.time
              && profileText(request.resource.data.rejectionReason,4000)
              && auditMatches(resource.data.status,resource.data.priority,'Rejected',request.resource.data.rejectionReason))
          );
      }
      // Priority-only writes never evaluate transition metadata or require a status change.
      function priorityUpdate() {
        return request.resource.data.status == resource.data.status
          && state(resource.data.status) in ['Pending','Approved','In Progress']
          && request.resource.data.priority != resource.data.priority
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['priority','lastEventId','updatedAt'])
          && auditMatches(resource.data.status,resource.data.priority,'Priority changed',null);
      }
      function studentUpdate(d, prior) {
        return prior.ownerId == request.auth.uid && state(prior.status) == 'Pending'
          && !d.title.matches('\\s*') && !d.description.matches('\\s*')
          && !d.hostel.matches('\\s*') && !d.roomNumber.matches('\\s*')
          && d.diff(prior).affectedKeys().hasOnly(['category','title','description','hostel','roomNumber','priority','photo','photoPath','photoUrl','lastEventId','updatedAt'])
          && (d.get('photoUrl',null) == null || d.get('photoUrl',null) == prior.get('photoUrl',null))
          && auditMatches(prior.status,prior.priority,'Updated',null);
      }
      function updateValid() {
        let d = request.resource.data;
        let prior = resource.data;
        let actorRole = role();
        return requestValid(d,id) && (actorRole == 'student' ? studentUpdate(d,prior)
          : actorRole == 'admin' ? (priorityUpdate() || (d.status != prior.status && transition())) : false);
      }
      allow update: if signed() && updateValid();
      allow delete: if signed() && role() == 'student' && resource.data.ownerId == request.auth.uid && state(resource.data.status) == 'Pending';
      match /history/{eventId} {
        function parent() { return get(/databases/$(database)/documents/requests/$(id)).data; }
        function afterParent() { return getAfter(/databases/$(database)/documents/requests/$(id)).data; }
        allow read: if readable(parent());
        // auditMatches() validates all event values on the parent write. This validator
        // enforces schema and a changed parent link, avoiding duplicate cross-document work.
        function historyValid() {
          let d = request.resource.data;
          let priorExists = exists(/databases/$(database)/documents/requests/$(id));
          let prior = priorExists ? parent() : {};
          let next = afterParent();
          let actorRole = role();
          return actorRole in ['student','admin']
            && d.keys().hasAll(['actorId','status','action','notes','createdAt','previousStatus','priorityBefore','priorityAfter'])
            && d.keys().hasOnly(['actorId','status','action','notes','createdAt','previousStatus','priorityBefore','priorityAfter'])
            && d.actorId == request.auth.uid && d.createdAt == request.time
            && d.action in ['Submitted','Updated','Approved','Started','Finished','Rejected','Priority changed']
            && next.lastEventId == eventId && next.updatedAt == request.time && d.status == next.status
            && (!priorExists || prior.get('lastEventId','') != eventId)
            && (actorRole == 'admin' || (next.ownerId == request.auth.uid && d.action in ['Submitted','Updated']));
        }
        allow create: if signed() && historyValid();
      }
    }
  }
}
```

## Complete Storage rules

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signed() { return request.auth != null; }
    // Both legacy and new privileged profiles use their backend-controlled role.
    function profile() { return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data; }
    function requestExists(id) { return firestore.exists(/databases/(default)/documents/requests/$(id)); }
    function issue(id) { return firestore.get(/databases/(default)/documents/requests/$(id)).data; }
    match /requests/{ownerId}/{requestId}/{fileName} {
      allow read: if signed() && requestExists(requestId) && issue(requestId).ownerId == ownerId
        && (request.auth.uid == ownerId || profile().role == 'admin');
      allow create: if resource == null && signed() && request.auth.uid == ownerId && profile().role == 'student'
        && requestExists(requestId) && issue(requestId).ownerId == ownerId && issue(requestId).status == 'Pending'
        && request.resource.size > 0 && request.resource.size <= 5 * 1024 * 1024
        && request.resource.contentType in ['image/jpeg','image/png','image/webp']
        && request.resource.metadata.ownerId == ownerId && request.resource.metadata.requestId == requestId;
      allow delete: if signed() && request.auth.uid == ownerId && (!requestExists(requestId) || (issue(requestId).ownerId == ownerId && issue(requestId).get('photoPath', '') != 'requests/' + ownerId + '/' + requestId + '/' + fileName));
    }
  }
}
```


