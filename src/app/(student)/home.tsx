import { Text, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { Screen, ui } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RequestCard } from '@/components/ui/RequestCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { REQUEST_STATUSES } from '@/constants/workflow';
export default function HomeScreen() {
  const { user } = useAuth();
  const data = useRequests();
  return <Screen refresh={data.retry} refreshing={data.loading}>
    <View><Text style={ui.title}>Hello, {user?.displayName?.split(' ')[0]}!</Text><Card style={{ marginTop: 8, padding: 20, gap: 6 }}><Text style={ui.heading}>{user?.displayName}</Text><Text style={ui.body}>Student ID: {user?.studentId}</Text><Text style={ui.label}>COLLEGE OF SCIENCE AND TECHNOLOGY</Text></Card></View>
    <Button title="+  Report Maintenance Issue" onPress={() => router.push('/report')} />
    {data.cached && <Text style={ui.body}>Saved data · may be out of date</Text>}
    {!!data.notice && <Text accessibilityRole="alert" style={ui.body}>{data.notice}</Text>}
    {!!data.error && <><Text style={ui.error}>{data.error}</Text><Button title="Retry" onPress={data.retry} /></>}
    {data.loading ? <ActivityIndicator /> : <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
      {REQUEST_STATUSES.map(status => <Card key={status} style={{ flexBasis: '46%', flexGrow: 1, minWidth: 128, padding: 16, gap: 12 }}><StatusBadge status={status} /><Text style={[ui.title,{fontSize:28,lineHeight:34,marginBottom:0}]}>{data.requests.filter(item=>item.status===status).length}</Text></Card>)}
    </View>}
    <View style={ui.row}><Text style={ui.heading}>Recent Requests</Text><Text style={ui.link} onPress={() => router.push('/(student)/requests')}>View All</Text></View>
    {data.requests.slice(0,3).map(item=><RequestCard key={item.id} request={item} />)}
    {!data.loading && !data.error && !data.requests.length && <Text style={ui.empty}>No requests yet. Report an issue to get started.</Text>}
  </Screen>;
}
