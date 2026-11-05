import type { RequestStatus } from '../types/index';

export const REQUEST_STATUSES = ['Pending', 'Approved', 'In Progress', 'Finished', 'Rejected'] as const;
export const STATUS_FILTERS = ['All', ...REQUEST_STATUSES] as const;
export function canTransition(from: string, to: RequestStatus): boolean {
  return (from === 'Pending' && (to === 'Approved' || to === 'Rejected'))
    || (from === 'Approved' && (to === 'In Progress' || to === 'Rejected'))
    || (from === 'In Progress' && to === 'Finished');
}
export function isTerminal(status: string): boolean { return status === 'Finished' || status === 'Rejected'; }
