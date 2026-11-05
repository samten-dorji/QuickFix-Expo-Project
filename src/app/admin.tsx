import { AuthGate } from '@/components/AuthGate';
import { Management } from '@/components/Management';
export default function AdminScreen(){return <AuthGate roles={['admin']}><Management/></AuthGate>;}
