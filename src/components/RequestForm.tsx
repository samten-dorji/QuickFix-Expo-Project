import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '@/contexts/AuthContext';
import { allocateRequestId, submitRequestWithPhoto } from '@/services/requestSubmission';
import { preparePhoto, signedPhoto, type PreparedPhoto } from '@/services/photos';
import { PHOTO_UPLOADS_AVAILABLE, PHOTO_UPLOAD_UNAVAILABLE_MESSAGE } from '@/config/photoStorage';
import { errorMessage } from '@/services/errors';
import { validateStudentRequestChanges } from '@/services/requestValidation';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Choices } from './ui/Choices';
import { Select } from './ui/Select';
import { Screen, ui } from './ui/Screen';
import type { MaintenanceRequest, RequestCategory, RequestPriority } from '@/types';
export function RequestForm({ request }: { request?: MaintenanceRequest }) {
  const { user } = useAuth(); const { isOffline } = useNetworkStatus();
  const [category,setCategory] = useState<RequestCategory>(request?.category ?? 'plumbing');
  const [priority,setPriority] = useState<RequestPriority>(request?.priority ?? 'Medium');
  const [hostel,setHostel] = useState(request?.hostel ?? user?.hostel ?? '');
  const [room,setRoom] = useState(request?.roomNumber ?? user?.roomNumber ?? '');
  const [title,setTitle] = useState(request?.title ?? '');
  const [description,setDescription] = useState(request?.description ?? '');
  const [photo,setPhoto] = useState<PreparedPhoto|null>(null);
  const [preview,setPreview] = useState<string|null>(null);
  const [photoChanged,setPhotoChanged] = useState(false);
  const [savedId,setSavedId] = useState(request?.id ?? '');
  const submissionId = useRef(request?.id ?? '');
  const [error,setError] = useState(''); const [busy,setBusy] = useState(false); const [stage,setStage] = useState(''); const [preparing,setPreparing] = useState(false);
  const [success,setSuccess] = useState('');
  const photoTouched=useRef(false);
  const lock = useRef(false); const controller = useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{
    let active=true;
    if(request?.photo) void signedPhoto(request.photo).then(value=>{if(active && !photoTouched.current)setPreview(value.url);}).catch(e=>{if(active)setError(errorMessage(e));});
    return ()=>{active=false;};
  },[request?.photo]);
  const pickerLock=useRef(false);
  async function choose(camera=false) {
    if(pickerLock.current || busy)return;
    pickerLock.current=true;setPreparing(true);
    try {
      if (!PHOTO_UPLOADS_AVAILABLE) throw new Error(PHOTO_UPLOAD_UNAVAILABLE_MESSAGE);
      if(camera) {const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted)throw new Error('Camera access is required. Allow it in device settings or choose from Gallery.');}
      if(!camera) {const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted)throw new Error('Photo library access is required. Allow access in device settings.');}
      const result = camera ? await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.8}) : await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.8});
      if(result.canceled)return;
      const image=result.assets[0];
      setPreparing(true);
      const prepared=await preparePhoto(image.uri,image.width,image.height);
      photoTouched.current=true;setPhoto(prepared);setPreview(prepared.uri);setPhotoChanged(true);setError('');
    } catch(e){setError(errorMessage(e));}finally{pickerLock.current=false;setPreparing(false);}
  }
  async function submit(withoutPhoto=false) {
    if(lock.current || preparing || !user)return;
    lock.current=true;setBusy(true);setError('');setSuccess('');controller.current=new AbortController();
    let id=savedId;
    try {
      if(isOffline)throw new Error('Reconnect before saving your request.');
      if(![hostel,room,title,description].every(value=>value.trim()))throw new Error('Complete all required fields.');
      const fields={category,priority,hostel:hostel.trim(),roomNumber:room.trim(),title:title.trim(),description:description.trim()};
      validateStudentRequestChanges(fields);
      if(!submissionId.current)submissionId.current=allocateRequestId();
      const result=await submitRequestWithPhoto({id:submissionId.current,ownerId:user.uid,editing:!!request,fields,
        photoChanged:withoutPhoto?true:photoChanged,image:withoutPhoto?null:photo,originalPhoto:request?.photo,
        signal:controller.current.signal,onStage:setStage});
      id=result.id;setSavedId(id);setPhotoChanged(false);
      if(withoutPhoto){setPhoto(null);setPreview(null);}
      const changed=result.changed;
      if (request) setSuccess(changed ? 'Request updated successfully.' : 'No changes to save.');
      else router.replace({pathname:'/requests/[id]',params:{id}});
    } catch(e){setError(errorMessage(e));}
    finally {setBusy(false);lock.current=false;setStage('');}
  }
  return <Screen back>
    <View><Text style={ui.title}>{request?'Edit Request':'Report an Issue'}</Text><Text style={ui.body}>Provide details to help us resolve the problem quickly.</Text></View>
    <Card style={{padding:20,gap:16}}>
      <Select label="Issue Category" values={['plumbing','electrical','hvac','furniture','room','other'] as const} value={category} onChange={setCategory} disabled={busy} />
      <View style={{flexDirection:'row',gap:12}}><View style={{flex:1}}><Input label="Hostel / Block" value={hostel} onChangeText={setHostel} maxLength={120} editable={!busy} /></View><View style={{flex:1}}><Input label="Room Number" value={room} onChangeText={setRoom} maxLength={120} editable={!busy} /></View></View>
      <Input label="Problem Title" placeholder="Brief description of the issue" value={title} onChangeText={setTitle} maxLength={160} editable={!busy} />
      <Input label="Detailed Description" placeholder="Explain the issue in detail..." value={description} onChangeText={setDescription} multiline style={{minHeight:120,textAlignVertical:'top'}} maxLength={4000} editable={!busy} />
      <Text style={ui.label}>Priority</Text><Choices values={['Low','Medium','High'] as const} value={priority} onChange={value=>{if(!busy)setPriority(value);}} />
      <Text style={ui.label}>Attach Photo (Optional)</Text>
      {!PHOTO_UPLOADS_AVAILABLE && <Text accessibilityLiveRegion="polite" style={ui.body}>{PHOTO_UPLOAD_UNAVAILABLE_MESSAGE}</Text>}
      {preview ? <><Image source={{uri:preview}} accessibilityLabel="Selected maintenance evidence" style={{width:'100%',height:200,borderRadius:8}} /><Button title="Remove Photo" variant="outline" disabled={busy || preparing} onPress={()=>{photoTouched.current=true;setPhoto(null);setPreview(null);setPhotoChanged(true);}} /></> : PHOTO_UPLOADS_AVAILABLE && <Pressable accessibilityRole="button" disabled={busy || preparing} onPress={()=>void choose()} style={{minHeight:140,borderWidth:2,borderStyle:'dashed',borderColor:'#c4c5d5',borderRadius:16,backgroundColor:'#edeef0',alignItems:'center',justifyContent:'center',gap:12}}><Feather name="camera" size={32} color="#00288e" /><Text style={[ui.body,{color:'#00288e'}]}>Tap to upload image</Text><Text style={ui.label}>JPEG - MAX 2 MB</Text></Pressable>}
      {PHOTO_UPLOADS_AVAILABLE && <View style={{gap:12}}><Button icon={<Feather name="image" size={18} color="#00288e"/>} title="Choose from Gallery" variant="outline" disabled={busy || preparing} onPress={()=>void choose()} /><Button icon={<Feather name="camera" size={18} color="#00288e"/>} title="Take Photo" variant="outline" disabled={busy || preparing} onPress={()=>void choose(true)} /></View>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {!!success && <Text accessibilityLiveRegion="polite" style={ui.body}>{success}</Text>}
      {!!error && photoChanged && !!photo && <Button title="Submit without photo" variant="outline" disabled={busy} onPress={()=>void submit(true)} />}
      {preparing && <Text accessibilityLiveRegion="polite" style={ui.body}>Preparing JPEG photo (maximum 2 MB)...</Text>}
      {!!stage && <><Text accessibilityLiveRegion="polite" style={ui.body}>{stage}</Text>{stage==='Uploading photo...' && <Button title="Cancel Upload" variant="outline" onPress={()=>controller.current?.abort()} />}</>}
      <Button title={busy?'Saving...':request?'Save Changes':savedId?'Save / Retry Request':'Submit Request'} onPress={()=>void submit()} disabled={busy || preparing || isOffline} />
      {!!savedId && (!!error || !!success) && <Button title="View Saved Request" variant="outline" onPress={()=>router.replace({pathname:'/requests/[id]',params:{id:savedId}})} />}
    </Card>
  </Screen>;
}
