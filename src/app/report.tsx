import { AuthGate } from '@/components/AuthGate';
import { RequestForm } from '@/components/RequestForm';
export default function ReportScreen(){return <AuthGate roles={['student']}><RequestForm /></AuthGate>;}
