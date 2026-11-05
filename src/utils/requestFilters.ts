import type { MaintenanceRequest, RequestFilters } from '../types/index';
import { normalizeStatus } from '../constants/badges';
export function filterRequests(requests: MaintenanceRequest[], filters: RequestFilters) {
  const search = filters.searchQuery?.trim().toLowerCase() ?? '';
  return requests.filter(item =>
    (!filters.status || filters.status === 'All' || normalizeStatus(item.status) === filters.status) &&
    (!filters.priority || filters.priority === 'All' || item.priority === filters.priority) &&
    (!filters.category || filters.category === 'All' || item.category === filters.category) &&
    (!search || [item.id, item.category, item.title, item.description, item.hostel, item.roomNumber, normalizeStatus(item.status), item.status, item.rawStatus, item.completionNotes, item.rejectionReason].some(value => value?.toLowerCase().includes(search)))
  );
}
