const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');let pg;
before(async()=>{
 pg=new PGlite();
 await pg.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth,storage to anon,authenticated;grant execute on function auth.jwt() to anon,authenticated;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id int generated always as identity,bucket_id text,name text);
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,anon;grant usage,select on all sequences in schema storage to authenticated,anon;`);
 await pg.exec(fs.readFileSync('supabase/storage.sql','utf8'));
 await pg.exec(`insert into quickfix_private.photo_students values('firebase-alice-string'),('firebase-bob-string');insert into quickfix_private.photo_admins values('firebase-admin-string');`);
});
after(async()=>{await pg?.close();});
async function actor(uid,sql,{project='fixquickproject',role='authenticated',provider='password'}={}){
 await pg.exec('reset role');await pg.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:uid,iss:'https://securetoken.google.com/'+project,aud:project,role,firebase:{sign_in_provider:provider}})]);await pg.exec('set role '+(role==='anon'?'anon':'authenticated'));
 try{return await pg.exec(sql);}finally{await pg.exec('reset role');}
}
const path='requests/firebase-alice-string/REQ-a/a.jpg';
test('private bucket enforces JPEG and 2 MB configuration',async()=>{const result=await pg.query("select * from storage.buckets where id='request-photos'");assert.equal(result.rows[0].public,false);assert.equal(Number(result.rows[0].file_size_limit),2097152);assert.deepEqual(result.rows[0].allowed_mime_types,['image/jpeg']);});
test('enrolled student uploads only within own UID path; string UIDs need no UUID casting',async()=>{
 await actor('firebase-alice-string',`insert into storage.objects(bucket_id,name) values('request-photos','${path}')`);
 for(const [uid,name]of [['firebase-bob-string',path],['pending', 'requests/pending/REQ-a/a.jpg'],['firebase-admin-string','requests/firebase-admin-string/REQ-a/a.jpg'],['firebase-alice-string','requests/firebase-alice-string/REQ-a/a.png']])await assert.rejects(actor(uid,`insert into storage.objects(bucket_id,name) values('request-photos','${name}')`));
});
test('owner and configured admin read; other students, pending admins, anonymous and foreign Firebase projects cannot read',async()=>{
 for(const uid of ['firebase-alice-string','firebase-admin-string'])assert.equal((await actor(uid,`select * from storage.objects where name='${path}'`))[0].rows.length,1);
 for(const [uid,options]of [['firebase-bob-string',{}],['pending',{}],['firebase-alice-string',{project:'attacker'}],['firebase-alice-string',{provider:'anonymous'}]])assert.equal((await actor(uid,`select * from storage.objects where name='${path}'`,options))[0].rows.length,0);
 assert.equal((await actor('firebase-alice-string',`select * from storage.objects where name='${path}'`,{role:'anon'}))[0].rows.length,0);
});
test('membership tables cannot be read or modified by mobile roles; role supplied by client grants no access',async()=>{
 for(const table of ['photo_students','photo_admins'])for(const sql of [`select * from quickfix_private.${table}`,`insert into quickfix_private.${table} values ('pending')`])await assert.rejects(actor('pending',sql));
 await actor('pending',"select set_config('request.fake_client_role','admin',false)");assert.equal((await actor('pending','select * from storage.objects'))[0].rows.length,0);
});
test('no overwrite, other-user delete or admin delete; owner cleanup works; revocation denies fresh reads',async()=>{
 assert.equal((await actor('firebase-alice-string',`update storage.objects set name='moved.jpg' where name='${path}' returning *`))[0].rows.length,0);
 for(const uid of ['firebase-bob-string','firebase-admin-string','pending'])assert.equal((await actor(uid,`delete from storage.objects where name='${path}' returning *`))[0].rows.length,0);
 await pg.exec("delete from quickfix_private.photo_admins where firebase_uid='firebase-admin-string'");assert.equal((await actor('firebase-admin-string','select * from storage.objects'))[0].rows.length,0);
 assert.equal((await actor('firebase-alice-string',`delete from storage.objects where name='${path}' returning *`))[0].rows.length,1);
});

test('restrictive guards prevent an unrelated broad policy from exposing this private bucket',async()=>{
 await pg.exec("create policy unrelated_permissive on storage.objects for all to authenticated using(true) with check(true)");
 await pg.exec("insert into quickfix_private.photo_admins values('firebase-admin-string');insert into storage.objects(bucket_id,name) values('request-photos','"+path+"')");
 assert.equal((await actor('firebase-bob-string','select * from storage.objects'))[0].rows.length,0);
 for(const [uid,name]of [['firebase-bob-string',path],['pending','requests/pending/REQ-a/a.jpg'],['firebase-admin-string','requests/firebase-admin-string/REQ-a/a.jpg'],['firebase-alice-string','requests/firebase-alice-string/REQ-a/a.png']])await assert.rejects(actor(uid,`insert into storage.objects(bucket_id,name) values('request-photos','${name}')`));
 assert.equal((await actor('firebase-admin-string','delete from storage.objects returning *'))[0].rows.length,0);
 assert.equal((await actor('firebase-alice-string',"update storage.objects set name='forged.jpg' returning *"))[0].rows.length,0);
});
