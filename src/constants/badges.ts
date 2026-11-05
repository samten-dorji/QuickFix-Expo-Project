import type { RequestPriority, RequestStatus } from '../types/index';

interface BadgeColors {
  readonly background: string;
  readonly text: string;
  readonly border: string;
}

// Keep the supplied Stitch palettes, keyed by the actual domain values.
export const StatusColors = {
  Pending: { background: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  Approved: { background: '#eef2ff', text: '#3730a3', border: '#a5b4fc' },
  'In Progress': { background: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  Finished: { background: '#f0fdf4', text: '#15803d', border: '#86efac' },
  Rejected: { background: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
} as const satisfies Record<RequestStatus, BadgeColors>;

export const PriorityColors = {
  Low: { background: '#f9fafb', text: '#6b7280', border: '#d1d5db' },
  Medium: { background: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  High: { background: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
} as const satisfies Record<RequestPriority, BadgeColors>;

export const NeutralBadgeColors: BadgeColors = {
  background: '#edeef0',
  text: '#444653',
  border: '#c4c5d5',
};

function normalizedLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeStatus(value: unknown): RequestStatus | null {
  switch (normalizedLabel(value)) {
    case 'pending': return 'Pending';
    case 'approved': return 'Approved';
    case 'in progress': return 'In Progress';
    case 'resolved':
    case 'finished': return 'Finished';
    case 'rejected': return 'Rejected';
    default: return null;
  }
}

export function normalizePriority(value: unknown): RequestPriority | null {
  switch (normalizedLabel(value)) {
    case 'low': return 'Low';
    case 'medium': return 'Medium';
    case 'high': return 'High';
    default: return null;
  }
}

export function statusBadge(value: unknown): { label: RequestStatus | 'Unknown status'; colors: BadgeColors } {
  const status = normalizeStatus(value);
  return status === null
    ? { label: 'Unknown status', colors: NeutralBadgeColors }
    : { label: status, colors: StatusColors[status] };
}

export function priorityBadge(value: unknown): { label: RequestPriority | 'Unknown priority'; colors: BadgeColors } {
  const priority = normalizePriority(value);
  return priority === null
    ? { label: 'Unknown priority', colors: NeutralBadgeColors }
    : { label: priority, colors: PriorityColors[priority] };
}
