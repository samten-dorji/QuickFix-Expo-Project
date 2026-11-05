-- Owner-only: run AFTER storage.sql and successful Firebase claim provisioning.
-- Confirm in Firebase Console fixquickproject that the first UID is already admin
-- and the second is student. This SQL never changes Firestore application roles.
begin;
delete from quickfix_private.photo_students where firebase_uid = 'bJNIgzMg7ife1vg1DmxTEzZ0Jww1';
insert into quickfix_private.photo_admins(firebase_uid)
values ('bJNIgzMg7ife1vg1DmxTEzZ0Jww1') on conflict do nothing;
delete from quickfix_private.photo_admins where firebase_uid = 'l5C4XFg3PeQqvDweTUxfMINvZd23';
insert into quickfix_private.photo_students(firebase_uid)
values ('l5C4XFg3PeQqvDweTUxfMINvZd23') on conflict do nothing;
commit;
