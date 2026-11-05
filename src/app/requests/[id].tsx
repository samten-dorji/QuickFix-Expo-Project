import { useLocalSearchParams } from 'expo-router';
import { AuthGate } from '@/components/AuthGate';
import { RequestDetails } from '@/components/RequestDetails';
export default function DetailsScreen(){const {id}=useLocalSearchParams<{id:string}>();return <AuthGate><RequestDetails id={id}/></AuthGate>;}
