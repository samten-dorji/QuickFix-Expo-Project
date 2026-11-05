import { AuthGate } from '@/components/AuthGate';
import { Management } from '@/components/Management';
export default function AdminHistoryScreen() { return <AuthGate roles={['admin']}><Management section="history"/></AuthGate>; }
