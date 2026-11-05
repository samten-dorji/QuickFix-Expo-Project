> Photo attachment update: see [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md). Private Supabase photos are implemented locally; owner configuration, enrollment, rules publication and live retrieval tests remain required. Earlier disabled-Firebase-photo instructions are historical.

# Save Priority and Mark Finished permission-denied repair

Updated 2026-11-05 (Asia/Dhaka). LOCAL SOURCE/RULES ONLY. Production rules were not fetched or deployed, and no production account/record was changed.

## Finding and isolated reproduction

The pre-repair local rules already supported valid admin priority/finish writes: the exact production service passed all Low/Medium/High changes on Pending, Approved and In Progress records, followed by finishing legacy In Progress work. The reported older deployed policy is incompatible with those payloads. A saved workspace checkpoint matching the reported old schema is retained as tests/fixtures/legacy-admin-operations.rules; it is a historical regression fixture, not a newly downloaded production ruleset.

- **Request update rejection:** the historical policy accepts Pending/In Progress/Resolved only, excludes priority from admin changed fields, and excludes lastEventId and new completion/admin-timestamp fields from the old schema. Direct request-only writes for both operations are denied in the emulator.
- **History rejection:** the historical history rule permits only actorId/status/action/createdAt and excludes both Priority changed and Finished actions. Today's service also writes notes/previousStatus/priorityBefore/priorityAfter. A diagnostic using current request rules with the unmodified old history block still rejects BOTH actual service transactions. This isolates a history-rule denial even when the request-side rules are current.
- Both documents belong to one transaction. A rejection of either aborts the entire operation. The client SDK's permission-denied response does not identify the individual failed rule; the isolated emulator policies identify the two independent incompatibilities. Nothing is silently saved without history.
- An additional service issue was reproduced: an unchanged priority returned success for a student before checking role. The baseline regression failed this case; the repaired service rejects non-admins before no-op handling.

## Actual client payloads and authorization

Both admin methods wait for Authentication and read users/{signed-in UID} inside the same transaction. Its saved role must be exactly admin, and identity is checked again before writing. The rules independently enforce the role, so this client check is not a substitute for authorization. Manual Console approval remains the single role source; no role, allowlist, invitation, claim or assignment is written by these operations.

**Save Priority** changes exactly:

- priority: Low, Medium or High (validated in the service and rules)
- lastEventId: newly generated history document ID
- updatedAt: serverTimestamp()

It leaves the exact stored status and all status-transition fields unchanged. The separate priorityUpdate rules branch is evaluated independently of transition(). It is allowed for Pending/Approved/In Progress only; terminal Finished/Rejected/legacy Resolved and unknown records retain their stricter lock. For an approved admin selecting the existing priority, the checked operation is a no-op and does not create a misleading event.

**Mark Finished** changes exactly:

- status: Finished, from saved In Progress (including supported spelling variants)
- completionNotes: trimmed non-whitespace text, maximum 4000 characters
- statusChangedBy and finishedBy: signed-in administrator UID
- statusChangedAt, finishedAt and updatedAt: serverTimestamp()
- lastEventId: newly generated history document ID

The service does not write Resolved, resolutionNotes, resolvedAt or assignment fields for new completions. Existing legacy fields are preserved without a migration. Legacy Resolved displays as Finished and stays terminal, with resolutionNotes/resolvedAt read as fallback completion data.

**History** changes exactly one new requests/{id}/history/{lastEventId} document:

| Field | Value |
| --- | --- |
| actorId | signed-in admin UID |
| status | exact saved after-status; unchanged for priority |
| action | Priority changed or Finished |
| notes | null for priority; matching completionNotes for Finished |
| previousStatus | exact raw saved before-status |
| priorityBefore / priorityAfter | exact before/after priorities |
| createdAt | serverTimestamp() |

Request rules require the matching new event using getAfter. History rules require the matching parent lastEventId/status/server timestamp and before/after values, explicit admin-only action authorization and matching terminal notes. History cannot be overwritten, deleted, forged, appended alone or left behind by a failed request write. Students cannot invoke either admin service or write admin-action events. The existing separate student edit flow for their own unreviewed Pending requests is preserved, including their original priority field; it emits Updated, not an admin Priority changed event.

Permission errors now identify the operation, actual runtime Firebase project and request/profile paths, preserve the underlying Firebase error as cause, and explain that the complete current request AND history rules must be published. An unapproved role receives an explicit approval message. These errors do not hide denial or report success.

## Publication and manual approval

1. Firebase Console > project **fixquickproject** > Firestore Database > default database > Rules.
2. Replace the WHOLE editor content with the COMPLETE block below, identical to firestore.rules. Click Publish. Do not publish only the request match or only the history match. firebase.rules is retired.
3. Authentication > Users: identify the intended administrator's exact UID. Firestore > users > that UID: verify its saved string role is admin. If it is pending_admin, the project owner must deliberately approve the intended account by editing only role to admin. Keep all other fields. No student can approve themselves.
4. Restart/update the app, refresh the profile, and retry with a nonterminal request. Mark Finished requires an In Progress record and completion notes. No billing, Functions deployment, assignment or data migration is required.

Optional exact PowerShell publication:

```powershell
Set-Location C:\Projects\QuickFixProjectII
npx.cmd firebase login --reauth
npx.cmd firebase deploy --project fixquickproject --only firestore:rules
npx.cmd expo start --clear
```

These are instructions, not commands executed to deploy by this session. No production publication, live account verification or physical-device test is claimed.

## Actual verification

- TypeScript: passed.
- Expo lint: passed, no errors/warnings.
- Unit tests: 27 passed, zero failed.
- Firestore/Storage emulator suite: 26 passed, zero failed, isolated demo projects only. Includes all three priority values on each mutable state without statusChanged fields; actual service finish with trimmed notes, UID/timestamp/history checks; same-value student priority rejection; student finish rejection; request/history omission/forgery rollback; old request-policy and isolated old history-policy reproductions; preserved profile/manual-approval and legacy-data checks.
- Baseline before repair: 23/24 passed; the failing new test exposed the unchecked student no-op. The actual approved-admin operations already passed the pre-repair local rules, confirming the need to publish the complete policy rather than changing Finished back to Resolved.
- Logs: .reference/admin-operations-before.log and .reference/admin-operations-final.log. Emulator authorization tests do not establish production publication, App Check/provider settings, billing or native behavior. Photo uploads remain unavailable.

## COMPLETE final firestore.rules

Copy the entire block, including request and nested history rules:

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

