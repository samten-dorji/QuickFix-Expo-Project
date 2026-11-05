> Photo attachment update: see [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md). Private Supabase photos are implemented locally; owner configuration, enrollment, rules publication and live retrieval tests remain required. Earlier disabled-Firebase-photo instructions are historical.

> Photo attachment update: see [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md). New private Supabase photos are implemented locally; owner configuration, enrollment, rules publication and live retrieval tests remain required. Earlier disabled-Firebase-photo instructions are historical.

# Student request editing and private history hiding

Updated 2026-11-05 (Asia/Dhaka). Implemented in LOCAL source and rules. No production rules, accounts, requests, audit records or preferences were changed or deployed by this session.

## Student edits

Details offers **Edit Request** only to the signed-in student owner of a Pending request. The existing /edit/[id] route preloads title, category, description, hostel/block, room number and priority. If the request becomes reviewed while that screen is open, the route returns to Details without editing controls.

The form validates required text and maximum lengths (title 160, description 4000, hostel/room 120), valid category and Low/Medium/High priority. It trims text, locks duplicate submissions, disables controls while saving, and shows success/error feedback. **View Saved Request** returns to Details after success. An unchanged retry returns No changes to save and adds no duplicate event.

The service rejects protected keys. Corrections change only allowed fields plus updatedAt and lastEventId. Request ID, owner, createdAt, status, photo references and admin-controlled fields are preserved. The transaction rereads the current request and the rules independently require the student role, owner UID and Pending state. Updated history and the request are committed atomically, with server timestamps. Students cannot edit other owners or Approved/In Progress/Finished/Rejected records. Concurrent stale writes can be rejected rather than weakening the audit before/after checks; tests confirm no duplicate edit event or protected-data overwrite.

The parent request rule compares the exact expected audit map (actor/time/status/prior status/prior and current priority/action/notes). The nested history validator enforces schema and a newly changed parent link. These checks jointly reject standalone, forged or partially committed events while avoiding repeated cross-document comparisons that consumed the rule expression budget. Shared realtime listeners already propagate corrections to student and admin screens.

Photo upload remains unavailable under the existing supported-storage decision. Editing does not enable Camera/Gallery or replace the storage provider; existing evidence remains preserved. No new native dependency is required.

## Delete from my history means private hiding

Both the student History tab and the new Admin History tab use the same HistoryEntries view. **Delete from my history** appears only on individual Finished/Rejected entries; legacy Resolved is read as Finished. Confirmation explicitly states that only the acting user's History view changes.

A confirmed hide writes exactly one private document:

`users/{acting Authentication UID}/historyPreferences/{request ID}`

| Field | Value |
| --- | --- |
| requestId | the same request ID as the preference document ID |
| hidden | true |
| updatedAt | server timestamp for this PRIVATE preference only |

Only its owner can read/list/create/update/delete these preferences. Even an approved admin cannot read or modify another user's preference collection. Creation/update additionally requires access to the target Finished/Rejected request: students can hide only their own requests; admins can hide requests they manage. Extra fields, false hidden flags, forged request IDs and client timestamps are denied. Pending/inactive staff accounts cannot use preferences.

Undo and **Show hidden entries** / **Restore to my history** restore one entry by deleting only that user's preference document. Preferences persist across sessions in Firestore. No bulk action exists. Restoring an orphaned preference is allowed for its owner even if a trusted operator previously removed its request.

History filtering happens only inside HistoryEntries. The shared request feed, operational request lists, dashboard counts, shared request updatedAt and all audit events are untouched. A student hiding a request does not remove it from the admin's history, and vice versa. Other user's preferences are never fetched. Until a server-confirmed preference snapshot is available, history waits rather than briefly showing entries that may be hidden; offline users can reconnect, and errors have a retry action. Request/History listeners clean up and preserve raw SDK diagnostics in development.

## Security and compatibility

Manual admin approval remains unchanged: users/{UID}.role is the authorization source, pending_admin is not privileged, and only the trusted project owner approves admin roles in Console. All five statuses, admin-only review/work actions, immutable terminal requests and legacy Resolved compatibility remain. No staff assignment, billing upgrade, Cloud Function or data migration is required. No new composite index is needed for the private preference collection read.

## Exact publication steps

Publish the COMPLETE current firestore.rules, including the new nested /users/{uid}/historyPreferences/{requestId} match and the complete request/history validators:

1. Firebase Console > project **fixquickproject** > Firestore Database > default database > **Rules**.
2. Replace the ENTIRE editor content with the complete block below (identical to firestore.rules), then click **Publish**. firebase.rules is retired; do not paste it.
3. Restart/update the client. Pending owner requests should show Edit Request. Terminal entries in either History screen should show Delete from my history, followed by Undo/Restore after confirmation.
4. Do not create preference collections manually; Firestore creates a user's reference document on the first confirmed hide. No shared request field or approval edit is needed for this feature.

Optional exact PowerShell publication by an authorized project owner:

```powershell
Set-Location C:\Projects\QuickFixProjectII
npx.cmd firebase login --reauth
npx.cmd firebase deploy --project fixquickproject --only firestore:rules
npx.cmd expo start --clear
```

Do not deploy Functions or Storage, enable billing, or replace rules with allow-all. The existing dashboard composite index remains a separate prerequisite if it has not been deployed; see FIRESTORE_INDEX_SETUP.md. No new index definitions are required by this feature.

## Actual verification

- Typecheck and Expo lint: passed, no diagnostics.
- Unit tests: 34 passed, including owner-only edit controls, prefilled/validated form, duplicate-save lock, success/errors, private History confirmation/Undo/Restore, empty state and preference listener cleanup/account guard/server-cache handling.
- Firestore/Storage emulator suite: 31 passed, zero failures. Covers all six corrections with a live admin listener, unchanged retry, concurrent stale-save rejection without duplicate audit, forbidden protected/reviewed/other-owner edits, student/admin hide and restore of Finished/Rejected/legacy Resolved entries, private cross-account read/write/delete denial, unchanged shared records/timestamps/audits and operational counts, and preserved admin operations/manual approval.
- iOS/Android production exports: passed; Expo Go device execution and screenshot/keyboard acceptance remain unverified.
- Tests use isolated demo projects only. Emulators do not establish deployed production rules or index readiness. No production deployment or live account operation is claimed.

Logs/artifacts: .reference/student-history-rules.log, .reference/student-edit-focus.log, .reference/student-history-export.log and .reference/student-history-export. Optional test-only QUICKFIX_RULE_COVERAGE=1 captures local emulator coverage for diagnosis. Initial regression debugging exposed a stale concurrent audit comparison; the final tests separately verify one accepted edit, an unchanged retry and safe concurrent rejection.

## COMPLETE updated Firestore rules

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
