const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function harness({ newAccount=false, wrongPassword=false, setupError, profileError, role='pending_admin' }={}) {
 const calls=[];
 const current={uid:'account-uid',email:'owner@example.test'};
 const auth={currentUser:current,authStateReady:async()=>{}};
 const filename=path.resolve(__dirname,'../src/services/auth.ts');
 const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));
 compiled.require=name=>{
  if(name==='firebase/auth')return {
   signInWithEmailAndPassword:async(_,email)=>{calls.push(['signin',email]);if(newAccount||wrongPassword)throw {code:'auth/invalid-credential'};},
   createUserWithEmailAndPassword:async()=>{calls.push(['create']);if(wrongPassword)throw {code:'auth/email-already-in-use'};},
  };
  if(name==='firebase/functions')throw new Error('Admin registration must not depend on Cloud Functions.');
  if(name==='firebase/firestore')return {
   doc:(_,collection,uid)=>{assert.equal(collection,'users');assert.equal(uid,current.uid);return {};},
   getDocFromServer:async()=>{calls.push(['read']);if(profileError)throw profileError;return {exists:()=>true,data:()=>({role,email:'owner@example.test',displayName:'Owner'})};},
  };
  if(name==='./firebase')return {auth,db:{}};
  if(name==='./userProfile')return {decodeUserProfile:(_,data)=>data};
  if(name==='./profile')return {createMissingPendingAdminProfile:async(_,uid,email,name,assertCurrent)=>{assertCurrent();calls.push(['pending',uid,email,name]);if(setupError)throw setupError;}};
  if(name==='./errors')return {};
  return Module.prototype.require.call(compiled,name);
 };
 compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 return {calls,register:()=>compiled.exports.registerAdmin('owner@example.test','Password123!','Owner')};
}
test('existing admin provisioning retries sign in without attempting account creation',async()=>{
 const app=harness();await app.register();
 assert.deepEqual(app.calls,[['signin','owner@example.test'],['pending','account-uid','owner@example.test','Owner'],['read']]);
});
test('only a new account uses password signup before pending profile setup',async()=>{
 const app=harness({newAccount:true});await app.register();
 assert.deepEqual(app.calls.map(call=>call[0]),['signin','create','pending','read']);
});
test('incorrect existing password cannot reach provisioning',async()=>{
 const app=harness({wrongPassword:true});await assert.rejects(app.register(),/correct password/);
 assert.equal(app.calls.some(call=>call[0]==='pending'),false);
});
test('denied pending-profile write reports preserved Authentication account and rules prerequisite',async()=>{
 const app=harness({setupError:{code:'permission-denied'}});
 await assert.rejects(app.register(),/account is preserved.*publish the updated Firestore rules/);
 assert.equal(app.calls.some(call=>call[0]==='read'),false);
});
test('failed profile setup or mismatched server reads cannot complete registration',async()=>{
 await assert.rejects(harness({setupError:new Error('Profile write failed')}).register(),/Profile write failed/);
 await assert.rejects(harness({profileError:new Error('Profile denied')}).register(),/Profile denied/);
 await assert.rejects(harness({role:'student'}).register(),/did not complete/);
});
test('already approved administrators preserve their existing role',async()=>{
 await harness({role:'admin'}).register();
});
