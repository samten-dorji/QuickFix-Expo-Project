import type { MaintenanceRequest } from '../types/index';

const textLimits = { title: 160, description: 4000, hostel: 120, roomNumber: 120 } as const;
const labels = { title: 'a title', description: 'a description', hostel: 'a hostel or block', roomNumber: 'a room number' } as const;
const allowed = [...Object.keys(textLimits), 'category', 'priority', 'photoPath', 'photoUrl', 'photo'];
export function validateStudentRequestChanges(input: Partial<MaintenanceRequest>): Partial<MaintenanceRequest> {
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Request identity, status and administrator fields cannot be edited.');
  const changes = { ...input };
  for (const key of Object.keys(textLimits) as (keyof typeof textLimits)[]) {
    if (!(key in changes)) continue;
    const value = changes[key];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > textLimits[key]) throw new Error(`Enter ${labels[key]} (1 to ${textLimits[key]} characters).`);
    changes[key] = value.trim();
  }
  if ('category' in changes && !['plumbing','electrical','hvac','furniture','room','other'].includes(changes.category ?? '')) throw new Error('Choose a valid issue category.');
  if ('priority' in changes && !['Low','Medium','High'].includes(changes.priority ?? '')) throw new Error('Choose Low, Medium or High priority.');
  if (changes.photo != null) {
    const photo = changes.photo;
    if (photo.provider !== 'supabase' || photo.bucket !== 'request-photos' || photo.mimeType !== 'image/jpeg' || !Number.isInteger(photo.size) || photo.size < 1 || photo.size > 2097152 || !/^requests\/[^/]+\/[^/]+\/[a-zA-Z0-9-]+\.jpg$/.test(photo.path) || !Number.isInteger(photo.width) || !Number.isInteger(photo.height) || photo.width < 1 || photo.height < 1 || photo.width > 1600 || photo.height > 1600) throw new Error('Invalid photo attachment. Select the photo again.');
  }
  return changes;
}
