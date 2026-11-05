const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs');
const {historyAttribution,historyDate}=load('src/utils/historyDisplay.ts');

test('history attribution uses permitted profiles and safe legacy fallbacks',()=>{
 assert.equal(historyAttribution('Submitted',{displayName:'Jigme',role:'student'}),'Submitted by: Jigme · Student');
 assert.equal(historyAttribution('Finished',{displayName:'Admin Name',role:'admin'}),'Updated by: Admin Name · Administrator');
 assert.equal(historyAttribution('Approved'),'Updated by: Administrator');
 assert.equal(historyAttribution('Submitted'),'Submitted by: Student');
 for(const action of ['Updated','Assigned','Resolved',undefined])assert.equal(historyAttribution(action),'Updated by: User');
 assert.equal(historyAttribution('Updated',{displayName:' ',role:'student'}),'Updated by: Student');
});

test('history time keeps the local date and timezone while removing seconds',()=>{
 const date=new Date(2026,10,5,23,39,55);
 assert.equal(historyDate(date),`${date.toLocaleDateString()}, ${date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',hour12:true})}`);
 assert.match(historyDate(date),/11:39\s*PM/i);
 assert.equal(historyDate(),'Saving...');
 assert.equal(historyDate(new Date(NaN)),'Saving...');
});

test('shared history never renders actor IDs or trusts event names; reads other profiles only for admins',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync('src/components/RequestHistory.tsx','utf8');
 assert.doesNotMatch(source,/Actor:|\{item\.actorId\}|value\.actorName|value\.actorRole/);
 assert.match(source,/if\(user\?\.role==='admin'\)await Promise\.all/);
 assert.match(source,/\\u2192/);
 assert.match(source,/version!==revision/);
});
