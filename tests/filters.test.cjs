const { test } = require('node:test');
const assert = require('node:assert/strict');
const { filterRequests } = require('./helpers/load-source.cjs')('src/utils/requestFilters.ts');
const { REQUEST_STATUSES, canTransition } = require('../src/constants/workflow.ts');
const rows=REQUEST_STATUSES.map((status,index)=>({id:'REQ-'+index,category:'plumbing',title:'Tap',description:'Leaking',hostel:'RK',roomNumber:'1',priority:'High',status}));
rows.push({...rows[0],id:'legacy',status:'Resolved',completionNotes:'Repaired leak'});
rows.push({...rows[0],id:'unknown',status:'Assigned'});
test('all five status filters and search use the saved canonical status, including Resolved compatibility',()=>{
 for(const status of REQUEST_STATUSES){
  assert.equal(filterRequests(rows,{status}).length,status==='Finished'?2:1);
  assert.equal(filterRequests(rows,{status,searchQuery:status}).length,status==='Finished'?2:1);
 }
 assert.equal(filterRequests(rows,{status:'Pending'}).some(row=>row.id==='unknown'),false);
 assert.equal(filterRequests(rows,{status:'All'}).length,7);
 assert.equal(filterRequests(rows,{status:'Finished',searchQuery:'Repaired'}).length,1);
 assert.equal(filterRequests(rows,{searchQuery:'Resolved'}).length,1);
});
test('search intersects status, priority and category without assignment',()=>{
 assert.deepEqual(filterRequests(rows,{status:'Approved',priority:'High',category:'plumbing',searchQuery:'rk'}).map(row=>row.id),['REQ-1']);
 assert.equal(filterRequests(rows,{status:'Approved',priority:'Low'}).length,0);
 assert.equal(filterRequests(rows,{searchQuery:'missing'}).length,0);
 for(const search of [' req-1 ','PLUMBING','leaking','Tap','1'])assert.ok(filterRequests(rows,{searchQuery:search}).length);
});
test('transition matrix is exact and terminal states cannot reopen',()=>{
 const valid=new Set(['Pending>Approved','Pending>Rejected','Approved>In Progress','Approved>Rejected','In Progress>Finished']);
 for(const from of [...REQUEST_STATUSES,'Unknown status'])for(const to of REQUEST_STATUSES)assert.equal(canTransition(from,to),valid.has(from+'>'+to));
});
