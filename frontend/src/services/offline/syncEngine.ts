import apiClient from '../apiClient';
import { offlineDB } from './db';

export async function flushOfflineInspectionQueue(): Promise<{ synced: number; failed: number }> {
  const pendingItems = await offlineDB.inspectionSyncQueue
    .where('syncStatus')
    .anyOf(['PENDING_WIFI', 'FAILED'])
    .toArray();

  let synced = 0;
  let failed = 0;

  for (const item of pendingItems) {
    if (!item.id) continue;
    try {
      await offlineDB.inspectionSyncQueue.update(item.id, { syncStatus: 'SYNCING' });
      await apiClient.post(`/quality/sessions/${item.sessionId}/submit_checklist/`, {
        readings: item.readings,
        inspector_remarks: `${item.inspectorRemarks} [Auto-Synced from Offline Cache @ ${item.queuedAt}]`,
        synced_from_offline_cache: true,
      });
      await offlineDB.inspectionSyncQueue.delete(item.id);
      synced++;
    } catch (err: any) {
      failed++;
      const msg = err?.response?.data?.message || err?.message || 'Sync error';
      await offlineDB.inspectionSyncQueue.update(item.id, {
        syncStatus: 'FAILED',
        errorMessage: msg,
      });
    }
  }

  return { synced, failed };
}