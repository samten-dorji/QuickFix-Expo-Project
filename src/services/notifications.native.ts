import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { auth } from './firebase';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:false,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
export async function enableStatusNotifications(uid: string) {
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('maintenance',{name:'Maintenance updates',importance:AndroidImportance.DEFAULT});
  const permissions=await Notifications.requestPermissionsAsync();
  if(!permissions.granted && permissions.ios?.status!==IosAuthorizationStatus.PROVISIONAL)throw new Error('Notifications are disabled. You can allow them in device settings. In-app status updates remain available.');
  await AsyncStorage.setItem('quickfix:notifications:'+uid,'enabled');
}
export async function notifyStatus(uid:string,body:string) {
  if(await AsyncStorage.getItem('quickfix:notifications:'+uid)!=='enabled' || auth.currentUser?.uid!==uid)return;
  await Notifications.scheduleNotificationAsync({content:{title:'Quick Fix status update',body},trigger:null});
}
