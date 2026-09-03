import { openDB, type DBSchema } from 'idb';

export interface SurveyData {
  id: string;
  inspectorName?: string;
  building: string;
  floor: string;
  room: string;
  roomType?: string;
  category: 'Hardware' | 'Projector' | 'AC' | 'Electrical' | 'Furniture' | 'Network' | 'Safety';
  assetTag?: string;
  rating: number;
  operationalStatus?: 'Functional' | 'Maintenance Needed' | 'Out of Order' | 'Critical Hazard';
  priorityLevel?: 'Low' | 'Medium' | 'High' | 'Emergency';
  issueTags?: string[];
  notes: string;
  actionRequired?: string;
  photoBase64?: string;
  timestamp: number;
  status: 'DRAFT' | 'PENDING_SYNC' | 'SYNCED';
}

interface SurveyDB extends DBSchema {
  drafts: { key: string; value: SurveyData };
  sync_queue: { key: string; value: SurveyData };
}

const DB_NAME = 'vku_field_survey_db';

export async function initDB() {
  return openDB<SurveyDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    },
  });
}

export async function saveDraft(survey: SurveyData) {
  const db = await initDB();
  await db.put('drafts', survey);
}

export async function addToSyncQueue(survey: SurveyData) {
  const db = await initDB();
  survey.status = 'PENDING_SYNC';
  await db.put('sync_queue', survey);
  await db.delete('drafts', survey.id);
}

export async function getPendingSyncQueue() {
  const db = await initDB();
  return db.getAll('sync_queue');
}

export async function removeCompletedSync(id: string) {
  const db = await initDB();
  await db.delete('sync_queue', id);
}
