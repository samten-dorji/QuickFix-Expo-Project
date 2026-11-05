export interface HistoryActor { displayName?: unknown; role?: unknown }

export function historyAttribution(action: string, profile?: HistoryActor): string {
  const role = profile?.role === 'admin' ? 'Administrator' : profile?.role === 'student' ? 'Student'
    : action === 'Submitted' ? 'Student'
    : ['Approved', 'Started', 'Finished', 'Rejected', 'Priority changed'].includes(action) ? 'Administrator' : 'User';
  const name = typeof profile?.displayName === 'string' ? profile.displayName.trim() : '';
  const label = action === 'Submitted' ? 'Submitted by' : 'Updated by';
  return `${label}: ${name ? `${name} · ${role}` : role}`;
}

export function historyDate(date?: Date): string {
  if (!date || !Number.isFinite(date.getTime())) return 'Saving...';
  // Retain the device locale's date and timezone; only time presentation changes.
  return `${date.toLocaleDateString()}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}
