import { useState } from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { filterRequests } from '@/services/requests';
import { errorMessage } from '@/services/errors';
import { NotificationSettings } from './NotificationSettings';
import { HistoryEntries } from './HistoryEntries';
import { REQUEST_STATUSES, STATUS_FILTERS } from '@/constants/workflow';
import { Screen, ui } from './ui/Screen';
import { Card } from './ui/Card';
import { Choices } from './ui/Choices';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { RequestCard } from './ui/RequestCard';
import { TabIcon } from './ui/TabIcon';
import type { RequestFilters } from '@/types';
export function Management({ section='dashboard' }: { section?: 'dashboard'|'requests'|'history'|'profile' }) {
 const {user,signOut}=useAuth();const data=useRequests();
 const insets=useSafeAreaInsets();
 const [search,setSearch]=useState('');const [status,setStatus]=useState<NonNullable<RequestFilters['status']>>('All');
 const [priority,setPriority]=useState<NonNullable<RequestFilters['priority']>>('All');
 const [category,setCategory]=useState<NonNullable<RequestFilters['category']>>('All');
 const [error,setError]=useState('');const admin=user?.role==='admin';
 const matches=filterRequests(data.requests,{status,priority,category,searchQuery:search});
 return <View style={{flex:1}}><Screen title="Quick Fix Admin" refresh={data.retry} refreshing={data.loading}>
  {section==='profile'?<>
   <Text style={ui.title}>Administrator Profile</Text><Card style={{gap:12,padding:20}}><Text style={ui.heading}>{user?.displayName}</Text><Text style={ui.body}>{user?.email}</Text><Text style={ui.label}>{user?.role}</Text></Card>
   <NotificationSettings/>
  </>:section==='history'?<HistoryEntries/>:<>
   <View><Text style={ui.title}>{section==='requests'?'All Requests':'Dashboard'}</Text><Text style={ui.body}>Hello, {user?.displayName}. Overview of maintenance requests</Text></View>
   {section==='dashboard'&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{['Total Requests',...REQUEST_STATUSES].map(label=><Card key={label} style={{flexBasis:'46%',flexGrow:1,minWidth:128,padding:16,gap:12}}><Text style={ui.label}>{label}</Text><Text style={[ui.title,{fontSize:28,lineHeight:34,marginBottom:0}]}>{label==='Total Requests'?data.requests.length:filterRequests(data.requests,{status:label as typeof REQUEST_STATUSES[number]}).length}</Text></Card>)}</View>}
   <Text style={ui.heading}>All Requests</Text>
   <Input label="Search Requests" placeholder="ID, category, location, description" value={search} onChangeText={setSearch}/>
   <Choices values={STATUS_FILTERS} value={status} onChange={setStatus}/>
   <Select label="Priority" values={['All','Low','Medium','High'] as const} value={priority} onChange={setPriority}/>
   <Select label="Category" values={['All','plumbing','electrical','hvac','furniture','room','other'] as const} value={category} onChange={setCategory}/>
   {data.cached&&<Text style={ui.body}>Saved data - may be out of date</Text>}
   {!!data.notice&&<Text accessibilityRole="alert" style={ui.body}>{data.notice}</Text>}
   {!!data.error&&<><Text style={ui.error}>{data.error}</Text><Button title="Retry" onPress={data.retry}/></>}
   {data.loading&&<ActivityIndicator/>}
   {matches.map(item=><RequestCard key={item.id} request={item}/>)}
   {!data.loading&&!data.error&&!matches.length&&<Text style={ui.empty}>No matching requests. Try another combination of filters.</Text>}
  </>}
  {!!error&&<Text style={ui.error}>{error}</Text>}
  <Button title="Logout" variant="outline" onPress={()=>void signOut().catch(e=>setError(errorMessage(e)))}/>
 </Screen>{admin&&<View style={{flexDirection:'row',justifyContent:'space-around',paddingTop:6,paddingHorizontal:8,paddingBottom:Math.max(8,insets.bottom),borderTopWidth:1,borderColor:'#e7e8ea',backgroundColor:'#ffffff'}}>
  <Link href="/admin" asChild><Pressable accessibilityRole="button" accessibilityState={{selected:section==='dashboard'}} style={{flex:1,minWidth:0,minHeight:62,marginHorizontal:4,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:4,paddingVertical:5,borderRadius:12,backgroundColor:'transparent'}}><TabIcon name="grid" active={section==='dashboard'}/><Text style={[ui.label,{fontSize:11,lineHeight:16,letterSpacing:0,textAlign:'center',color:section==='dashboard'?'#1e40af':'#444653'}]}>Dashboard</Text></Pressable></Link>
  <Link href="/admin-requests" asChild><Pressable accessibilityRole="button" accessibilityState={{selected:section==='requests'}} style={{flex:1,minWidth:0,minHeight:62,marginHorizontal:4,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:4,paddingVertical:5,borderRadius:12,backgroundColor:'transparent'}}><TabIcon name="list" active={section==='requests'}/><Text style={[ui.label,{fontSize:11,lineHeight:16,letterSpacing:0,textAlign:'center',color:section==='requests'?'#1e40af':'#444653'}]}>Requests</Text></Pressable></Link>
  <Link href="/admin-history" asChild><Pressable accessibilityRole="button" accessibilityLabel="Admin History" accessibilityState={{selected:section==='history'}} style={{flex:1,minWidth:0,minHeight:62,marginHorizontal:4,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:4,paddingVertical:5,borderRadius:12,backgroundColor:'transparent'}}><TabIcon name="clock" active={section==='history'}/><Text style={[ui.label,{fontSize:11,lineHeight:16,letterSpacing:0,textAlign:'center',color:section==='history'?'#1e40af':'#444653'}]}>History</Text></Pressable></Link>
  <Link href="/admin-profile" asChild><Pressable accessibilityRole="button" accessibilityState={{selected:section==='profile'}} style={{flex:1,minWidth:0,minHeight:62,marginHorizontal:4,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:4,paddingVertical:5,borderRadius:12,backgroundColor:'transparent'}}><TabIcon name="user" active={section==='profile'}/><Text style={[ui.label,{fontSize:11,lineHeight:16,letterSpacing:0,textAlign:'center',color:section==='profile'?'#1e40af':'#444653'}]}>Profile</Text></Pressable></Link>
 </View>}</View>;
}
