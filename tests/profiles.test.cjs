const {test}=require('node:test');const assert=require('node:assert/strict');
const {decodeUserProfile}=require('../src/services/userProfile.ts');
test('new privileged profiles do not require or fabricate student fields',()=>{
 for(const role of ['admin','staff','pending_admin']){
  const user=decodeUserProfile('uid',{email:'user@example.test',displayName:'Name',role});
  assert.equal(user.role,role);assert.equal(user.studentId,undefined);assert.equal(user.hostel,undefined);assert.equal(user.roomNumber,undefined);
 }
});
test('student validation and legacy privileged fields are preserved',()=>{
 assert.throws(()=>decodeUserProfile('uid',{email:'a@b.test',displayName:'Name',role:'student'}),/studentId/);
 const user=decodeUserProfile('uid',{email:'a@b.test',displayName:'Name',role:'admin',studentId:'original',hostel:'RK',roomNumber:'102'});
 assert.equal(user.studentId,'original');assert.equal(user.hostel,'RK');
 assert.throws(()=>decodeUserProfile('uid',{email:'a@b.test',displayName:'Name',role:'superadmin'}),/unsupported role/);
});
