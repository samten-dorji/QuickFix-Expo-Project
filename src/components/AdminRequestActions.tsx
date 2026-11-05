import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { changeRequestPriority, getRequestStudent, updateRequestStatus } from '@/services/requests';
import { isTerminal } from '@/constants/workflow';
import { errorMessage } from '@/services/errors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card } from './ui/Card';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { ui } from './ui/Screen';
import type { MaintenanceRequest, RequestPriority, User } from '@/types';
export function AdminRequestActions({request}:{request:MaintenanceRequest}) {
 const [student,setStudent]=useState<User|null>(null);const [studentError,setStudentError]=useState('');const [revision,setRevision]=useState(0);
 const [priority,setPriority]=useState<RequestPriority>(request.priority);
 const [completion,setCompletion]=useState('');const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const lock=useRef(false);
 const {isOffline}=useNetworkStatus();
 useEffect(()=>{let active=true;void getRequestStudent(request.ownerId).then(profile=>{if(active){setStudent(profile);setStudentError(profile?'':'Student profile unavailable.');}}).catch(e=>{if(active)setStudentError(errorMessage(e));});return()=>{active=false;};},[request.ownerId,revision]);
 async function run(action:()=>Promise<void>,success:string){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setError('');try{if(isOffline)throw new Error('Reconnect before updating a request.');await action();setMessage(success);}catch(e){setError(errorMessage(e));}finally{setBusy(false);lock.current=false;}}
 const disabled=busy||isOffline;
 return <>
  <Card style={{gap:10}}><Text style={ui.heading}>Reported By</Text>{student?<><Text style={ui.body}>{student.displayName}</Text><Text style={ui.body}>{student.email}</Text>{student.studentId&&<Text style={ui.body}>Student ID: {student.studentId}</Text>}</>:!studentError?<Text style={ui.body}>Loading student information...</Text>:null}{!!studentError&&<><Text style={ui.error}>{studentError}</Text><Button title="Retry Student Information" onPress={()=>setRevision(value=>value+1)}/></>}</Card>
  {!isTerminal(request.status)&&request.status!=='Unknown status'&&<Card style={{gap:12}}>
   <Text style={ui.heading}>Request Management</Text>
   <Select label="Priority" values={['Low','Medium','High'] as const} value={priority} onChange={setPriority} disabled={busy}/>
   <Button title="Save Priority" variant="outline" disabled={disabled||priority===request.priority} onPress={()=>void run(()=>changeRequestPriority(request.id,priority),'Priority updated.')} />
   {request.status==='Pending'&&<Button title="Approve Request" disabled={disabled} onPress={()=>void run(()=>updateRequestStatus(request.id,'Approved'),'Request approved.')} />}
   {request.status==='Approved'&&<Button title="Start Work" disabled={disabled} onPress={()=>void run(()=>updateRequestStatus(request.id,'In Progress'),'Work started.')} />}
   {request.status==='In Progress'&&<>
    <Input label="Completion Notes" multiline maxLength={4000} value={completion} onChangeText={setCompletion} editable={!busy} style={{minHeight:100}} />
    <Button title="Mark Finished" disabled={disabled||!completion.trim()} onPress={()=>void run(()=>updateRequestStatus(request.id,'Finished',completion),'Request finished.')} />
   </>}
   {(request.status==='Pending'||request.status==='Approved')&&<>
    <Input label="Rejection Reason" multiline maxLength={4000} value={reason} onChangeText={setReason} editable={!busy} style={{minHeight:90}} />
    <Button title="Reject Request" variant="danger" disabled={disabled||!reason.trim()} onPress={()=>void run(()=>updateRequestStatus(request.id,'Rejected',reason),'Request rejected.')} />
   </>}
  </Card>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}{!!error&&<Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
 </>;
}
