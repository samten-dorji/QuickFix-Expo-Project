import { AuthGate } from '@/components/AuthGate';
import { Management } from '@/components/Management';
export default function AdminRequests(){return <AuthGate roles={['admin']}><Management section="requests"/></AuthGate>;}
