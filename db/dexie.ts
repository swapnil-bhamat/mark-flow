import Dexie, { type Table } from 'dexie';

export interface Document {
  id: string; // uuid
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  revisionId: string;
  deviceId: string;
  isSynced: number; // 0 or 1 (for easy indexing in Dexie)
  gdriveId?: string;
  gdriveVersion?: string;
}

export interface Revision {
  id: string; // uuid
  docId: string;
  content: string;
  timestamp: number;
}

export interface Preference {
  key: string;
  value: any;
}

class MarkdownDatabase extends Dexie {
  documents!: Table<Document, string>;
  revisions!: Table<Revision, string>;
  preferences!: Table<Preference, string>;

  constructor() {
    super('MarkdownPWA_DB');
    this.version(1).stores({
      documents: 'id, title, createdAt, updatedAt, isSynced, gdriveId',
      revisions: 'id, docId, timestamp',
      preferences: 'key',
    });
  }
}

export const db = new MarkdownDatabase();
