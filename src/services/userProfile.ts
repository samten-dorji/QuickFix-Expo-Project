import type { User } from '../types/index';
export function decodeUserProfile(uid: string, data: Record<string, unknown>): User {
  function required(key: string): string {
    const value = data[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error('Your profile has an invalid '+key+'. Contact the administrator.');
    return value;
  }
  function date(value: unknown): Date {
    if (value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
    return typeof value === 'string' ? new Date(value) : new Date(0);
  }
  const base = { uid, email: required('email'), displayName: required('displayName'), createdAt: date(data.createdAt), updatedAt: date(data.updatedAt) };
  if (data.role === 'student') return { ...base, role: 'student', studentId: required('studentId'), hostel: required('hostel'), roomNumber: required('roomNumber') };
  if (data.role === 'admin' || data.role === 'staff' || data.role === 'pending_admin') return {
    ...base, role: data.role,
    ...(typeof data.studentId === 'string' ? { studentId: data.studentId } : {}),
    ...(typeof data.hostel === 'string' ? { hostel: data.hostel } : {}),
    ...(typeof data.roomNumber === 'string' ? { roomNumber: data.roomNumber } : {}),
  };
  throw new Error('Your profile has an unsupported role. Contact the administrator.');
}
