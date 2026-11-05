> Existing-account enrollment status (2026-11-05): Firebase photo claims are **provisioned and read-back verified remotely** for admin `bJNIgzMg7ife1vg1DmxTEzZ0Jww1` and student `l5C4XFg3PeQqvDweTUxfMINvZd23`. Their existing Firestore `admin`/`student` roles and enabled Auth accounts were verified first, and application roles were not changed. Other custom claims were preserved. The initial ADC attempt failed; the successful attempt used the existing Firebase CLI owner login in memory, with read-only Firestore REST verification. No privileged credential was written to Expo or project files.
>
> **Still pending:** run [supabase/enroll-photo-users.sql](supabase/enroll-photo-users.sql) in this project's Supabase SQL Editor **after** `supabase/storage.sql`. The exact two UID memberships are prepared but not remotely applied; no Supabase owner connection is available here. Firebase integration settings, bucket/policies, production rules publication and live upload/admin retrieval remain unverified. The generic Firebase claim alone does not grant Storage access. The app refreshes its Firebase token on photo access; reload/retry after Supabase setup. Do not rerun claim provisioning merely because these historical commands appear below.

> Local configuration repair: the required private bucket is now **request-photos**, consistently in the mobile configuration/types, SQL, Firestore rules and tests. The actual root `.env` now contains the supplied Supabase Project URL and publishable key, preserving Firebase public configuration. Blank Supabase overrides were removed from `.env.local`. No privileged key was used. `.env.example` alone is not an Expo-loaded env file.
>
> Remaining order: (1) Supabase dashboard: enable Firebase third-party auth for `fixquickproject`, then run the complete `supabase/storage.sql`; (2) Firebase Console: copy each existing student's/approved admin's Auth UID and verify its matching `users/{UID}.role`; (3) trusted workstation: run the claim/enrollment script below separately for each UID, then run its printed membership SQL in Supabase SQL Editor; (4) publish the complete Firestore rules using the exact CLI command below. Firebase custom claim `role: authenticated` is required by this implementation; Supabase UID tables separately control student/admin storage privileges. No remote step has been confirmed complete.

# Supabase private maintenance photos — owner setup

Implemented locally on 2026-11-05. **NOT deployed and NOT yet proven operational:** local Supabase URL/publishable key are now supplied, but remote project enrollment, live upload/admin retrieval and physical-device execution remain unverified. Finish the setup and live checklist below before describing photos as working. Text-only requests remain usable now.

## Supported integration and Free prerequisites

This uses Supabase's native **Firebase third-party authentication**, keeping Firebase login and Firestore roles. There is no Supabase signup/login, Firebase Storage upload, Cloud Function, Edge Function, Firebase billing upgrade, service-role mobile key or token-signing workaround.

Official sources checked before implementation:

- [Firebase third-party auth](https://supabase.com/docs/guides/auth/third-party/firebase-auth): register your Firebase project in Supabase; Firebase ID tokens must carry the trusted custom claim `role: authenticated`. The client supplies those tokens with the supported `accessToken` callback. Hosted Supabase validates the registered Firebase project's signatures/issuer. Our policies additionally check issuer and audience.
- [Current Free pricing](https://supabase.com/pricing): $0 Free includes 1 GB file storage, 5 GB egress and 50,000 third-party monthly active users. Free projects can pause after one inactive week; limits can make photos unavailable. Choose Free, keep within its quotas, and do not upgrade or enable paid add-ons for this setup.
- [React Native upload reference](https://supabase.com/docs/reference/javascript/storage-from-upload): uploads use an ArrayBuffer, rather than native Blob/FormData. Installed supabase-js: 2.119.x. Upload cancellation passes AbortSignal through the client's fetch transport; it does not invent an unsupported upload option.
- Installed Expo SDK 58: [image picker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/), [image manipulator](https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/), [file system](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), [crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/). These packages support Expo Go. No generated native folders were added. Device execution remains untested.

**Important operational prerequisite:** without a trusted hosted backend, brand-new Firebase users cannot automatically mint the required custom claim or enroll themselves in protected storage tables. The owner must run the workstation enrollment step for **each student** who needs photos, and for each approved admin. Registration/text-only requests still work before enrollment. Pending admins and legacy staff are never enrolled. The generic claim `authenticated` grants no maintenance/admin privileges by itself; protected UID tables control storage roles.

## 1. Create and connect the Free project

1. At Supabase Dashboard create a new project under a **Free organization**; choose a nearby region and a strong database password. Save that password in your password manager, never in Expo env/source.
2. In the new project's **Authentication ? Third-Party Auth** (or Third-Party integrations) choose **Add integration ? Firebase**. Enter Firebase project ID **`fixquickproject`**, save/enable it. Do not use a different Google project or Supabase Auth as a replacement login provider.
3. From the project's Connect dialog / Settings API configuration copy its HTTPS **Project URL** and **publishable key** (`sb_publishable_...`). These are public client values. Never use `sb_secret_...`, legacy `service_role`, a database password or signing key in Expo.
4. In SQL Editor run the **complete** [supabase/storage.sql](supabase/storage.sql). It creates a dedicated **private** bucket named **`request-photos`**, sets allowed MIME `image/jpeg`, max size **2,097,152 bytes**, creates protected string-UID tables/functions, and installs restrictive RLS. No bucket public access or blanket authenticated reads.
5. In Storage confirm the bucket is private, maximum file size 2 MB, allowed MIME `image/jpeg`. If creating it manually first, use this exact name and settings, then run the SQL anyway to install the policies. Do not expose `quickfix_private` through the Data API. Do not add broad policies or let users insert into the enrollment tables.
6. Copy `.env.example` to `.env.local` if needed; preserve existing Firebase values. Fill only:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://fjolamgjdhxoxemhouyk.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   ```

   The supplied project is `fjolamgjdhxoxemhouyk`; its URL and publishable key are configured in the root `.env`. Remote project setup has not been confirmed. The bucket is fixed in code and SQL. Restart Metro after changing env:

   ```powershell
   Set-Location C:\Projects\QuickFixProjectII
   npx.cmd expo start --clear
   ```

## 2. Enroll an existing administrator UID (and students)

Firebase Console project **fixquickproject ? Authentication ? Users**: copy the exact user's **UID**, a string (not a PostgreSQL UUID). In Firestore **users ? that UID**, verify the same signed-in account already has `role` string **`admin`**, manually approved by the project owner. Storage enrollment never promotes a Firestore role. For students verify `role` is `student` instead.

On your trusted workstation install Google Cloud CLI if unavailable, sign in as the owner/IAM principal authorized to read profiles and manage Firebase Authentication users, and use Application Default Credentials. Firebase CLI login alone is not ADC. These commands modify only the chosen user's generic custom claim; they do not deploy functions or enable billing:

```powershell
Set-Location C:\Projects\QuickFixProjectII
npm.cmd ci --prefix functions
gcloud auth application-default login
$photoUid = Read-Host 'Paste the existing Firebase Authentication UID to enroll'
node functions/scripts/enroll-photos.cjs --project fixquickproject --confirm-project fixquickproject --uid $photoUid
```

The script rejects disabled accounts, absent profiles, pending admins, legacy staff, conflicting existing custom role claims, emulator variables and another project ID. It merges other custom claims, sets `role: authenticated`, then prints the **exact UID-quoted SQL** to paste in Supabase SQL Editor. Run that printed SQL. It removes any earlier student/admin storage membership for that UID and inserts exactly one matching trusted role. Run separately for each photo-enabled student and existing approved admin. Never run old invitation/bootstrap scripts for this workflow.

Owner credentials need Firebase Authentication user-management access and Firestore profile-read access (project Owner already has these). No service-account file is needed with ADC. If organizational policy prevents ADC, use an owner-managed service account only on a trusted workstation; never commit its credentials or put them in an EXPO_PUBLIC variable. No token/email/password is sent to an assistant or saved by this script.

To review enrolled admins in SQL Editor:

```sql
select firebase_uid from quickfix_private.photo_admins order by firebase_uid;
```

To manually enroll an already claimed/approved account using SQL Editor, replace the string below with the **copied Auth UID**, not an email:

```sql
begin;
delete from quickfix_private.photo_students where firebase_uid = 'COPIED_FIREBASE_AUTH_UID';
insert into quickfix_private.photo_admins(firebase_uid)
values ('COPIED_FIREBASE_AUTH_UID') on conflict do nothing;
commit;
```

The enrollment script refreshes no mobile session itself. The app requests a fresh Firebase ID token before each photo operation, so retry after enrollment or sign out/in. SQL alone without the required Firebase custom claim is insufficient.

## 3. Publish complete Firestore rules

The complete publishable rules are [firestore.rules](firestore.rules), also reproduced below. They accept `photo: null` or the explicit bounded Supabase metadata map, preserve legacy absent fields and old assignment fields inertly, and retain protected roles, private history preferences and atomic request/audit rules. They cannot validate an object's existence in another provider; Storage RLS independently authorizes every upload/signed URL.

Deploy **only Firestore rules**, after reviewing the project ID:

```powershell
Set-Location C:\Projects\QuickFixProjectII
npx.cmd firebase login
npx.cmd firebase deploy --project fixquickproject --only firestore:rules
```

Or open Firebase Console **fixquickproject ? Firestore Database ? Rules**, replace the entire editor with `firestore.rules`, and Publish. Do not paste SQL into Firebase rules. Do not deploy Functions, Firebase Storage or billing changes.

## 4. Revoke or change storage access

Firestore remains the authority for application admin operations. When revoking an administrator, **also** remove their independent Supabase photo membership, because Supabase cannot query Firestore roles. First run this in Supabase SQL Editor with the copied UID (remove both rows so an old student enrollment cannot retain access):

```sql
begin;
delete from quickfix_private.photo_admins where firebase_uid = 'REVOKED_FIREBASE_AUTH_UID';
delete from quickfix_private.photo_students where firebase_uid = 'REVOKED_FIREBASE_AUTH_UID';
commit;
```

Then in Firebase Console change `users/{UID}.role` from `admin` to `pending_admin` to remove active app access, or disable the Auth account if appropriate. Never automatically convert staff to admin. Re-enroll a deliberately approved role change by rerunning the script and printed SQL. Revoke student photo access by deleting both storage rows too.

Removal blocks new authorized storage operations even while an old Firebase token still exists. **Already issued signed URLs can remain usable for up to 120 seconds**, including the client's memory cache; downloaded copies cannot be recalled. Do not share those URLs. No expiring URL is written to Firestore or persistent local storage.

## Implemented behavior and limits

- Take Photo / Choose from Gallery request permissions, handle cancellation, preserve an existing selection on picker failure, preview/remove/replace one image. The app re-encodes JPEG at <=1600 px longest edge and checks actual upload bytes <=2 MB. Images that cannot meet the limit are rejected.
- Upload finishes before request creation. Failure leaves the form and photo available for retry, with an explicit **Submit without photo** action. A synchronous save lock prevents duplicate taps; a stable preallocated ID and create-only transaction recover uncertain creation commits without overwriting existing/reviewed records.
- `photo` stores `{provider:'supabase', bucket:'request-photos', path:'requests/<FirebaseUID>/<requestId>/<randomUUID>.jpg', mimeType:'image/jpeg', size, width, height}`. `photoUrl` and `photoPath` remain null for new attachments. Existing fields/data are not deleted or migrated.
- Request Details gets private signed URLs, refreshes before expiry/on foreground/retry, shows loading/errors, and opens a full-screen image on tap. Legacy Firebase evidence shows an explicit unavailable message; this implementation performs no Firebase Storage SDK reads/writes and does not promise access to old files.
- Cancellation uses AbortController and prevents proceeding to Firestore after a canceled upload. An interrupted response can leave an uploaded object. Candidates are queued per UID before upload; the profile's **Clean Up Unused Photos** action checks fresh server request references, waits at least a minute, and only attempts owner cleanup for unreferenced objects. Replaced photos are queued. Failed/uncertain cleanup stays queued. Legacy Firebase cleanup queues are left untouched.
- Cleanup is best effort, not distributed garbage collection: an app uninstall can lose the local queue, and independent Firestore/Storage transactions cannot be atomic. Owners can remove confirmed orphan objects through Supabase **Storage dashboard**, after checking the matching Firestore request. Do not DELETE storage.objects rows manually; use the Storage UI/API so bytes are removed too.
- The owner-only DELETE policy permits students to delete their **own** storage objects (needed for cleanup); Supabase cannot know whether Firestore still references them or reviewed the request. App code checks that reference before cleanup. A deliberately modified client can remove its own evidence; if tamper-proof retention becomes required, revoke client DELETE and use trusted operator cleanup. It still cannot delete/read another student's objects or grant admin access. Object UPDATE/overwrite is denied, including to admins.
- Missing/invalid public configuration explains setup is required and leaves photo-less registration/request management usable. An unenrolled configured account receives a clear enrollment/storage error; it can explicitly submit without the selected photo.

## Live acceptance checklist — still required

1. Enroll a student and the already approved admin with the script + SQL. Keep a second student separately enrolled and a pending admin absent from both tables. Use physical iPhone and Android Expo Go, signed into the existing Firebase accounts.
2. Select a large gallery image / take a photo; inspect JPEG preview, replace/remove, cancel the picker, deny permissions and retry. Submit once/double tap: verify one request + one Submitted audit event, correct durable metadata, no signed URL, JPEG <=2 MB in private bucket.
3. Sign in as the authorized admin and **retrieve/enlarge that exact uploaded photo**. This is the required end-to-end milestone before claiming photos work. Student owner should also retrieve it; unrelated enrolled student and pending admin must get a denied/missing result even when given the exact object path (use their authenticated token, not a shared signed URL).
4. Break connectivity / remove membership before upload: no Firestore request should be created with an incomplete photo; Retry works after restoring configuration/connectivity; explicit without-photo submits null metadata. Cancel upload and retry; inspect/clean queued orphan objects after a minute.
5. Leave Details open beyond two minutes and foreground/retry after expiry. Check loading/unavailable states with a deleted object. New signed URLs should work without persisting them in Firestore.
6. Review a request; students cannot replace photo or edit protected/reviewed fields. Test admin approve/start/finish/reject, Pending corrections, private history hide/restore, dashboard counts and live updates. Revoke admin's SQL membership + Firestore role and confirm fresh photo access denied (allow earlier signed URL's <=120s lifetime).

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
