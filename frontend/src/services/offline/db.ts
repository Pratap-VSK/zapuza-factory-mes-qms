import Dexie, { type Table } from 'dexie';

export interface OfflineInspectionQueueItem {
  id?: number;
  sessionId: string;
  sessionCode: string;
  travelerBarcode: string;
  stationCode: string;
  readings: Array<{
    pin_id: string;
    gauge_serial: string;
    measured_numeric_value: string | number | null;
    visual_pass: boolean | null;
    defect_photo_1_url: string;
    defect_photo_2_url: string;
  }>;
  inspectorRemarks: string;
  queuedAt: string;
  syncStatus: 'PENDING_WIFI' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

export class ZapuzaOfflineDB extends Dexie {
  inspectionSyncQueue!: Table<OfflineInspectionQueueItem, number>;

  constructor() {
    super('ZapuzaShopfloorOfflineDB');
    this.version(1).stores({
      inspectionSyncQueue: '++id, sessionId, travelerBarcode, syncStatus, queuedAt',
    });
  }
}

export const offlineDB = new ZapuzaOfflineDB();