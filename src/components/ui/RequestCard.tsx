import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { ui } from './Screen';
import type { MaintenanceRequest } from '@/types';
export function RequestCard({ request, history = false }: { request: MaintenanceRequest; history?: boolean }) {
  return <Card onPress={() => router.push({ pathname: '/requests/[id]', params: { id: request.id } })} style={{ padding: 16, gap: 12 }}>
    <View style={[ui.row,{flexWrap:'wrap'}]}><Text style={[ui.label, { flex: 1, flexBasis: 180, minWidth: 0, flexShrink: 1, fontSize: 12, lineHeight: 18, letterSpacing: 0 }]}>{request.id} - {request.category}</Text><StatusBadge status={request.status} /></View>
    <Text style={[ui.heading,{fontSize:17,lineHeight:24}]}>{request.title}</Text>
    <Text style={ui.body}>{request.hostel}, Room {request.roomNumber}</Text>
    <View style={[ui.row,{flexWrap:'wrap'}]}><Text style={ui.caption}>{new Date(request.createdAt).toLocaleDateString()}</Text><PriorityBadge priority={request.priority} /></View>
    {history && (request.completionNotes || request.rejectionReason) && <View style={{ backgroundColor: '#f8f9fb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e7e8ea' }}><Text style={ui.body}><Text style={{ fontFamily: 'Inter_600SemiBold' }}>{request.rejectionReason ? 'Rejection reason: ' : 'Completion: '}</Text>{request.rejectionReason ?? request.completionNotes}</Text></View>}
    <Text style={[ui.link, { textAlign: 'right', paddingTop: 8, paddingBottom: 0, borderTopWidth: 1, borderColor: '#e7e8ea' }]}>View Details</Text>
  </Card>;
}
