// Only student/admin are active roles; staff is retained solely to decode old accounts.
export type UserRole = 'student' | 'staff' | 'admin' | 'pending_admin';

export type RequestStatus = 'Pending' | 'Approved' | 'In Progress' | 'Finished' | 'Rejected';

export type RequestPriority = 'Low' | 'Medium' | 'High';

export type RequestCategory = 'electrical' | 'plumbing' | 'hvac' | 'furniture' | 'room' | 'other';

interface BaseUser {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentUser extends BaseUser {
  role: 'student';
  studentId: string;
  hostel: string;
  roomNumber: string;
}

export interface PrivilegedUser extends BaseUser {
  role: 'staff' | 'admin';
  // Preserve legacy student fields; legacy staff accounts have no active workflow access.
  studentId?: string;
  hostel?: string;
  roomNumber?: string;
}

export interface PendingAdminUser extends BaseUser {
  role: 'pending_admin';
  studentId?: string;
  hostel?: string;
  roomNumber?: string;
}

export type User = StudentUser | PrivilegedUser | PendingAdminUser;

export interface PhotoAttachment {
  provider: 'supabase';
  bucket: 'request-photos';
  path: string;
  mimeType: 'image/jpeg';
  size: number;
  width: number;
  height: number;
}

export interface MaintenanceRequest {
  photo?: PhotoAttachment | null;
  id: string;
  ownerId: string;
  category: RequestCategory;
  title: string;
  description: string;
  hostel: string;
  roomNumber: string;
  priority: RequestPriority;
  status: RequestStatus | 'Unknown status';
  rawStatus?: string;
  photoUrl: string | null;
  photoPath?: string | null;
  completionNotes: string | null;
  rejectionReason: string | null;
  statusChangedBy?: string;
  statusChangedAt?: Date | null;
  approvedBy?: string;
  approvedAt?: Date | null;
  startedBy?: string;
  startedAt?: Date | null;
  finishedBy?: string;
  finishedAt?: Date | null;
  rejectedBy?: string;
  rejectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastEventId?: string;
}

export interface RequestFilters {
  status?: RequestStatus | 'All';
  searchQuery?: string;
  priority?: RequestPriority | 'All';
  category?: RequestCategory | 'All';
}
