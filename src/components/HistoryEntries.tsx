import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { useHistoryPreferences } from '@/hooks/useHistoryPreferences';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { hideHistoryRequest, restoreHistoryRequest } from '@/services/historyPreferences';
import { filterRequests } from '@/services/requests';
import { errorMessage } from '@/services/errors';
import { isTerminal, STATUS_FILTERS } from '@/constants/workflow';
import type { MaintenanceRequest, RequestFilters } from '@/types';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Choices } from './ui/Choices';
import { Button } from './ui/Button';
import { RequestCard } from './ui/RequestCard';
import { ui } from './ui/Screen';

export function HistoryEntries() {
  const { user } = useAuth();
  const data = useRequests(); const preferences = useHistoryPreferences(); const { isOffline } = useNetworkStatus();
  const [search,setSearch] = useState(''); const [status,setStatus] = useState<NonNullable<RequestFilters['status']>>('All');
  const [category,setCategory] = useState<NonNullable<RequestFilters['category']>>('All');
  const [showHidden,setShowHidden] = useState(false); const [busy,setBusy] = useState(false);
  const [error,setError] = useState(''); const [message,setMessage] = useState('');
  const [lastHidden,setLastHidden] = useState<{uid:string;id:string}|null>(null);
  const lock = useRef(false);
  const ready = !preferences.loading && !preferences.error;
  const hidden = new Set(preferences.hiddenIds);
  const matches = ready ? filterRequests(data.requests,{status,category,searchQuery:search}).filter(item=>hidden.has(item.id)===showHidden) : [];
  async function run(id:string,restore:boolean) {
    if (lock.current || !user) return;
    lock.current=true;setBusy(true);setError('');setMessage('');
    try {
      if(isOffline)throw new Error('Reconnect before changing your history.');
      if(restore) {await restoreHistoryRequest(id,user.uid);setLastHidden(null);setMessage('Restored to your history.');}
      else {await hideHistoryRequest(id,user.uid);setLastHidden({uid:user.uid,id});setMessage('Removed from your history. The request and audit records are unchanged.');}
    } catch(failure) {setError(errorMessage(failure));}
    finally {setBusy(false);lock.current=false;}
  }
  function confirm(request:MaintenanceRequest) {
    if(lock.current)return;
    Alert.alert('Delete from my history?', 'Hide this entry only from your History screen? The request, audit events, other users\' history and dashboard counts will not be deleted or changed.', [
      {text:'Cancel',style:'cancel'},
      {text:'Delete from my history',style:'destructive',onPress:()=>void run(request.id,false)},
    ]);
  }
  return <>
    <View><Text style={ui.title}>Maintenance History</Text><Text style={ui.body}>Your saved requests. Removing an entry affects only your History screen.</Text></View>
    <Input label="Search History" value={search} onChangeText={setSearch} placeholder="Request, status, location or notes" />
    <Choices values={STATUS_FILTERS} value={status} onChange={setStatus}/>
    <Select label="Category" values={['All','plumbing','electrical','hvac','furniture','room','other'] as const} value={category} onChange={setCategory} disabled={busy}/>
    <Button title={showHidden?'Back to My History':`Show hidden entries (${preferences.hiddenIds.length})`} variant="outline" disabled={busy||!ready} onPress={()=>setShowHidden(value=>!value)} icon={<Feather name={showHidden?'list':'eye-off'} size={18} color="#00288e"/>}/>
    {!!message&&<Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}
    {lastHidden?.uid===user?.uid&&lastHidden&&<Button title="Undo" variant="outline" disabled={busy||isOffline} onPress={()=>void run(lastHidden.id,true)} icon={<Feather name="rotate-ccw" size={18} color="#00288e"/>}/>}
    {!!error&&<Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {preferences.loading&&<Text style={ui.body}>{isOffline?'Reconnect to load your private history preferences.':'Loading your private history preferences...'}</Text>}
    {!!preferences.error&&<><Text accessibilityRole="alert" style={ui.error}>{preferences.error}</Text><Button title="Retry History Preferences" disabled={isOffline} onPress={preferences.retry}/></>}
    {!!data.error&&<><Text accessibilityRole="alert" style={ui.error}>{data.error}</Text><Button title="Retry Requests" onPress={data.retry}/></>}
    {data.cached&&<Text style={ui.body}>Saved requests may be out of date.</Text>}
    {(data.loading||preferences.loading)&&<ActivityIndicator accessibilityLabel="Loading history" color="#1e40af" style={{paddingVertical:20}}/>}
    {matches.map(request=><View key={request.id} style={{gap:8}}>
      <RequestCard request={request} history/>
      {showHidden?<Button title="Restore to my history" variant="outline" disabled={busy||isOffline} onPress={()=>void run(request.id,true)} icon={<Feather name="rotate-ccw" size={18} color="#00288e"/>}/>
        :isTerminal(request.status)&&<Button title="Delete from my history" variant="outline" disabled={busy||isOffline} onPress={()=>confirm(request)} icon={<Feather name="trash-2" size={18} color="#00288e"/>}/>}
    </View>)}
    {ready&&!data.loading&&!data.error&&!matches.length&&<Text style={ui.empty}>{showHidden?'No hidden entries match these filters.':'Your history is empty or no entries match these filters. You can restore hidden entries using Show hidden entries.'}</Text>}
  </>;
}
