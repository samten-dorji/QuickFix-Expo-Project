import { AuthGate } from '@/components/AuthGate';
import { Management } from '@/components/Management';
export default function AdminProfile(){return <AuthGate roles={['admin']}><Management section="profile"/></AuthGate>;}
