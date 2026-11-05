import { allocateRequestId, createRequest, getRequestFromServer, updateRequest } from './requests';
import { uploadPhoto, type PreparedPhoto } from './photos';
import { forgetPhoto, rememberPhoto } from './photoQueue';
import type { MaintenanceRequest, PhotoAttachment } from '../types';
export { allocateRequestId };
export async function submitRequestWithPhoto(options: {
  id: string; ownerId: string; editing: boolean; fields: Partial<MaintenanceRequest>;
  photoChanged: boolean; image: PreparedPhoto | null; originalPhoto?: PhotoAttachment | null;
  signal?: AbortSignal; onStage?: (stage: string) => void;
}) {
  const { id, ownerId, editing, fields, signal } = options;
  const existing = await getRequestFromServer(id);
  if (existing && existing.ownerId !== ownerId) throw new Error('Request owner changed.');
  if (!editing && existing) return { id, changed: false }; // Recover an ambiguous prior commit.
  if (editing && (!existing || existing.status !== 'Pending')) throw new Error('Only Pending requests can be edited.');
  let photo = options.originalPhoto ?? null;
  if (options.photoChanged) {
    options.onStage?.('Uploading photo...');
    photo = options.image ? await uploadPhoto(id, options.image, { signal }) : null;
  }
  if (signal?.aborted) throw new Error('Submission canceled. No request was submitted.');
  options.onStage?.('Saving request...');
  // A failed/uncertain commit retains its queued upload. Cleanup checks the server reference.
  const changed = editing
    ? await updateRequest(id, { ...fields, ...(options.photoChanged ? { photo, photoUrl: null, photoPath: null } : {}) })
    : (await createRequest({ ...fields, ownerId, photo, photoUrl: null, completionNotes: null, rejectionReason: null } as Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>, id), true);
  if (photo) await forgetPhoto(photo).catch(() => {});
  if (options.photoChanged && options.originalPhoto && options.originalPhoto.path !== photo?.path) await rememberPhoto(options.originalPhoto).catch(() => {});
  return { id, changed };
}
