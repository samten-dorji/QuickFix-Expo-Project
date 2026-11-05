import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
export function RegistrationTabs({ selected }: { selected: 'student' | 'admin' }) {
  return <View style={{ flexDirection:'row', gap:8 }}>
    <Link href="/register" replace asChild><Pressable accessibilityRole="button" accessibilityState={{selected:selected==='student'}} style={{flex:1,minHeight:52,padding:12,borderRadius:12,borderWidth:1,borderColor:'#1e40af',backgroundColor:selected==='student'?'#1e40af':'#fff',justifyContent:'center'}}><Text style={{fontFamily:'Inter_600SemiBold',fontSize:13,lineHeight:20,textAlign:'center',color:selected==='student'?'#fff':'#1e40af'}}>Student Registration</Text></Pressable></Link>
    <Link href="/register-admin" replace asChild><Pressable accessibilityRole="button" accessibilityState={{selected:selected==='admin'}} style={{flex:1,minHeight:52,padding:12,borderRadius:12,borderWidth:1,borderColor:'#1e40af',backgroundColor:selected==='admin'?'#1e40af':'#fff',justifyContent:'center'}}><Text style={{fontFamily:'Inter_600SemiBold',fontSize:13,lineHeight:20,textAlign:'center',color:selected==='admin'?'#fff':'#1e40af'}}>Admin Registration</Text></Pressable></Link>
  </View>;
}
