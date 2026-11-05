import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useRequests } from '@/hooks/useRequests';
import { filterRequests } from '@/services/requests';
import { Input } from './ui/Input';
import { Choices } from './ui/Choices';
import { RequestCard } from './ui/RequestCard';
import { Button } from './ui/Button';
import { Screen, ui } from './ui/Screen';
import type { RequestFilters } from '@/types';
import { STATUS_FILTERS } from '@/constants/workflow';
import { HistoryEntries } from './HistoryEntries';
export function RequestList({ history = false }: { history?: boolean }) {
  return history ? <Screen title="History"><HistoryEntries/></Screen> : <OperationalRequests/>;
}
function OperationalRequests() {
  const data = useRequests();
  const [search,setSearch] = useState('');
  const [status,setStatus] = useState<NonNullable<RequestFilters['status']>>('All');
  const requests = filterRequests(data.requests,{status,searchQuery:search});
  return <Screen refresh={data.retry} refreshing={data.loading}>
    <Input accessibilityLabel="Search requests" placeholder="Search ID, category, location, description" value={search} onChangeText={setSearch} />
    <Choices values={STATUS_FILTERS} value={status} onChange={setStatus} />
    {data.cached && <Text style={ui.body}>Saved data · may be out of date</Text>}
    {!!data.notice && <Text accessibilityRole="alert" style={[ui.body,{color:'#00288e'}]}>{data.notice}</Text>}
    {!!data.error && <><Text accessibilityRole="alert" style={ui.error}>{data.error}</Text><Button title="Retry" onPress={data.retry} /></>}
    {data.loading && <ActivityIndicator color="#1e40af" style={{paddingVertical:20}} />}
    {requests.map(item => <RequestCard key={item.id} request={item} />)}
    {!data.loading && !data.error && !requests.length && <Text style={ui.empty}>No matching requests.</Text>}
  </Screen>;
}
