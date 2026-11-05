// Trusted workstation/Cloud Shell only. Uses Application Default Credentials, never mobile credentials.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
async function main() {
  const args=process.argv.slice(2);
  const value=flag=>args[args.indexOf(flag)+1];
  const project=value('--project');const uid=value('--uid');const name=value('--name');
  if (!args.includes('--project') || !args.includes('--uid') || !args.includes('--name') || !args.includes('--confirm-project') || !project || !uid || !name?.trim() || name.length>120 || value('--confirm-project')!==project) throw new Error('Usage: --project PROJECT_ID --uid VERIFIED_AUTH_UID --name "Administrator Name" --confirm-project PROJECT_ID');
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Bootstrap must target the explicitly confirmed production project, not emulator variables.');
  const app=initializeApp({projectId:project,credential:applicationDefault()});
  const account=await getAuth(app).getUser(uid);
  if(account.disabled||!account.emailVerified||!account.email)throw new Error('The chosen existing Auth account must be enabled and email-verified.');
  const db=getFirestore(app);
  await db.runTransaction(async transaction=>{
    const marker=db.doc('system/firstAdmin');
    const initialized=await transaction.get(marker);
    const admins=await transaction.get(db.collection('users').where('role','==','admin').limit(1));
    const target=db.doc('users/'+uid);const prior=await transaction.get(target);
    if(initialized.exists||!admins.empty)throw new Error('An administrator already exists. Use administrator invitations.');
    if(prior.exists&&prior.data().role!=='student')throw new Error('Refusing to replace an existing privileged role.');
    transaction.set(target,{...prior.data(),uid,email:account.email.trim().toLowerCase(),displayName:prior.data()?.displayName??name.trim(),role:'admin',createdAt:prior.data()?.createdAt??FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    transaction.create(marker,{uid,createdAt:FieldValue.serverTimestamp()});
    transaction.create(db.collection('roleAudit').doc(),{uid,actorId:'trusted-bootstrap',fromRole:prior.data()?.role??null,toRole:'admin',createdAt:FieldValue.serverTimestamp()});
  });
  console.log('First administrator provisioned in project '+project+' for UID '+uid+'. No other profile was changed.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
