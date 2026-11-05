> Photo attachment update: see [SUPABASE_PHOTOS_SETUP.md](SUPABASE_PHOTOS_SETUP.md). Private Supabase photos are implemented locally; owner configuration, enrollment, rules publication and live retrieval tests remain required. Earlier disabled-Firebase-photo instructions are historical.

# Admin registration without billing or Cloud Functions

Updated 2026-11-05 (Asia/Dhaka). This guide supersedes ALL earlier callable, invitation, email-allowlist and approvedUids instructions for administrator registration. Source/rules changes are LOCAL; production rules have not been published and no account has been manually approved by this session.

## Registration and the single authorization source

The form contains Full Name, Email Address, Password, password visibility toggle and one Create Admin Account submit action. Registration uses Firebase Email/Password Authentication and a create-only Firestore transaction at `users/{Authentication UID}`. A new profile has exactly these fields:

| Field | Value/type |
| --- | --- |
| uid | Authentication UID, string |
| email | Authenticated account email, string |
| displayName | Entered full name, trimmed string |
| role | `pending_admin`, string |
| createdAt | Firestore server timestamp |
| updatedAt | Firestore server timestamp |

Only `users/{uid}.role` determines authorization. `pending_admin` grants NO administrator permissions. There are no approval flags, custom claims, email allowlists or UID allowlists in this flow. The screen displays **Account created. Awaiting administrator approval.** Approval is manual, not immediate.

The client signs in with existing credentials before attempting signup. An account whose previous provisioning failed is reused; profile setup can be resumed safely. A valid existing pending/admin profile is never overwritten. Existing student/staff profiles remain unchanged; if that account needs an admin role, the owner must review and edit its existing profile manually. With email enumeration protection, a new email and an incorrect existing password may share an error; the duplicate-create fallback cannot overwrite an existing Auth account.

The app reads back the saved profile from the server before completing registration. A denied/failed write does not display success. If the transaction committed but the subsequent read failed, retry with the same email/password. No invitation, email verification, Functions deployment, Admin SDK credential or Blaze upgrade is required for this registration flow. Authentication and Firestore usage remain subject to the project's normal quotas.

## Publish the complete Firestore rules first

1. Open Firebase Console and choose project **fixquickproject**. Confirm it matches `src/config/firebase.ts` / the app's public project override.
2. In Authentication > Sign-in method, enable Email/Password. Preserve existing users.
3. Initialize the default Firestore database if absent using the project's available no-billing setup; select a deliberate region and publish the complete rules below. Do not choose test/allow-all rules.
4. Firestore Database > Rules: replace the complete editor content with the COMPLETE Firestore block below (identical to `firestore.rules`), then click **Publish**.
5. `firebase.rules` is a retired comment-only file. Do not paste it or combine Storage rules with Firestore rules.

Optional PowerShell publication, if Firebase CLI is authenticated and authorized:

```powershell
Set-Location C:\Projects\QuickFixProjectII
npx.cmd firebase login --reauth
npx.cmd firebase deploy --project fixquickproject --only firestore:rules
npx.cmd expo start --clear
```

Do NOT run a plain `firebase deploy` or deploy Functions/Storage for this registration change. The older functions/ package is historical tooling, not an active mobile workflow; all staff invitation/provisioning controls and registerAdmin have been removed from the mobile flow. No function call is needed to create or approve a pending account. No live deployment is claimed here.

## Exact manual approval in Firebase Console

Use the project owner's trusted Firebase Console/IAM account, not an account signed into the mobile app:

1. In project **fixquickproject**, open Authentication > Users. Locate the intended account, confirm the intended person controls it through your trusted process, and copy its exact UID. An email typed during signup alone is not proof of ownership.
2. Firestore Database > default database > Data > **users** > document whose ID is that **exact UID**. Confirm its `uid` field matches and its email/name identify the intended account. Do not edit another person's profile.
3. The newly registered document should have `role` as a **string** with value **pending_admin**.
4. Edit that one field: change `role` from **pending_admin** to **admin** (lowercase string), and Save. Preserve `uid`, `email`, `displayName`, `createdAt` and all legacy student fields. You may update `updatedAt` to the current time using a timestamp field, but this is not required to activate access.
5. Do not add `approved`, `isAdmin`, `approvalStatus`, custom claims or entries under `system/adminRegistration`. Those are not authorization sources. The only activation edit is `users/{uid}.role = admin`.
6. Keep the app connected. Its existing profile snapshot listener receives the change, refreshes the watched role, and routes from the waiting screen through /dashboard to the Admin Dashboard. Alternatively tap **Refresh Approval Status**. Signing out/back in also reloads the profile. Offline accounts cannot detect a new Console approval until reconnected.

For an existing Authentication account with no profile, submit the same three-field Admin Registration form first to create its pending document. Do not delete/recreate the Auth account. If an existing student/staff account is deliberately approved, edit its existing `role` to `admin` only after owner review; retain the rest of its data. The client never changes an existing role itself.

Pending users can read their own profile, but cannot query administrator requests, read other users' profiles, manage requests, write an active privileged role, or approve themselves. Protected routes redirect pending users to /pending-admin, and the global request feed does not subscribe or load request caches for them. Approved admins use the same existing role checks and request management rules. Student registration and existing accounts/data remain intact.

## Photo storage is a separate billing blocker

The configured bucket is **fixquickproject.firebasestorage.app**. Cloud Storage for Firebase requires the **Blaze** plan; no-cost usage on Blaze does not mean billing is unnecessary. Firebase also applies Blaze requirements to legacy appspot.com buckets, so renaming the bucket is not a workaround. See [Firebase's current Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

Under the requested no-billing setup, photo uploads are **unavailable**. Upload selection is hidden in the request form, a clear unavailable message is shown, and the upload service refuses before file/Storage network access. Requests can still be created and managed without a photo. Existing photo URLs/paths/data are preserved; legacy previews still attempt their original reads, but successful live Storage access is not claimed. No provider, bucket or billing setting was changed, and no images are silently stored in Firestore.

Choose a supported storage solution separately before re-enabling uploads. `src/config/photoStorage.ts` records the current disabled state. See PHOTO_STORAGE_STATUS.md. Existing Storage security rules remain unchanged and are included below for reference, not as a promise that the service works on Spark.


## Current request workflow

Only student and admin are active application roles. Old staff accounts are preserved but inactive, never automatically promoted. Administrators approve, start, finish or reject work directly without assignment. See WORKFLOW_UPDATE.md for compatibility, exact publication steps and verification. Its complete rules are reproduced below. Publish the updated Firestore rules; also update Storage rules if an existing supported bucket is in use, to remove old assignment-based staff photo access. Uploads remain unavailable.

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


