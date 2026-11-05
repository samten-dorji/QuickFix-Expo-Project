import { useState } from 'react';
import { TextInput, Text, View, type TextInputProps } from 'react-native';
import { Typography } from '@/constants/theme';
interface InputProps extends TextInputProps { label?: string; error?: string; icon?: React.ReactNode }
export function Input({label,error,icon,style,onFocus,onBlur,...props}:InputProps){
 const [focused,setFocused]=useState(false);
 return <View style={{marginBottom:0,gap:8}}>
  {!!label&&<Text style={{...Typography.bodyMD,fontFamily:'Inter_600SemiBold',color:'#191c1e'}}>{label}</Text>}
  <View style={{flexDirection:'row',alignItems:'center',minHeight:52,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:error?'#ba1a1a':focused?'#1e40af':'#c4c5d5',borderRadius:12,backgroundColor:'#fff'}}>
   {!!icon&&<View style={{marginRight:12}}>{icon}</View>}
   <TextInput {...props} accessibilityLabel={props.accessibilityLabel??label??props.placeholder} placeholderTextColor="#757684" onFocus={event=>{setFocused(true);onFocus?.(event);}} onBlur={event=>{setFocused(false);onBlur?.(event);}} style={[{flex:1,minWidth:0,...Typography.bodyLG,color:'#191c1e',padding:0},style]}/>
  </View>
  {!!error&&<Text accessibilityRole="alert" style={{...Typography.bodyMD,color:'#ba1a1a'}}>{error}</Text>}
 </View>;
}
