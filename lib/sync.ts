import { db, type Document } from '@/db/dexie';

interface GDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  appProperties?: {
    id?: string;
    updatedAt?: string;
    deviceId?: string;
    revisionId?: string;
    title?: string;
  };
  modifiedTime?: string;
}

export class GDriveSyncEngine {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Helper to perform Google Drive REST API calls
   */
  private async apiCall(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GDrive API Error (${response.status}): ${errorText}`);
    }

    return response;
  }

  /**
   * List files stored in the appDataFolder
   */
  async listFiles(): Promise<GDriveFileMetadata[]> {
    const url = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      spaces: 'appDataFolder',
      fields: 'files(id, name, mimeType, appProperties, modifiedTime)',
      pageSize: '1000',
    }).toString();

    const data = await this.apiCall(url).then(res => res.json());
    return data.files || [];
  }

  /**
   * Download the text content of a file
   */
  async downloadFileContent(fileId: string): Promise<string> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await this.apiCall(url);
    return await response.text();
  }

  /**
   * Upload a new file to Google Drive appDataFolder
   */
  async uploadFile(doc: Document): Promise<{ gdriveId: string; version: string }> {
    const metadata = {
      name: `${doc.id}.md`,
      mimeType: 'text/markdown',
      parents: ['appDataFolder'],
      appProperties: {
        id: doc.id,
        updatedAt: String(doc.updatedAt),
        deviceId: doc.deviceId,
        revisionId: doc.revisionId,
        title: encodeURIComponent(doc.title),
      },
    };

    const boundary = 'foo_bar_baz_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
      doc.content +
      closeDelimiter;

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,version';
    
    const response = await this.apiCall(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    const data = await response.json();
    return { gdriveId: data.id, version: String(data.version || '1') };
  }

  /**
   * Update an existing file on Google Drive
   */
  async updateFile(gdriveId: string, doc: Document): Promise<string> {
    const metadata = {
      name: `${doc.id}.md`,
      appProperties: {
        id: doc.id,
        updatedAt: String(doc.updatedAt),
        deviceId: doc.deviceId,
        revisionId: doc.revisionId,
        title: encodeURIComponent(doc.title),
      },
    };

    const boundary = 'foo_bar_baz_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
      doc.content +
      closeDelimiter;

    const url = `https://www.googleapis.com/upload/drive/v3/files/${gdriveId}?uploadType=multipart&fields=version`;
    
    const response = await this.apiCall(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    const data = await response.json();
    return String(data.version || '1');
  }

  /**
   * Delete a file on Google Drive
   */
  async deleteFile(gdriveId: string): Promise<void> {
    const url = `https://www.googleapis.com/drive/v3/files/${gdriveId}`;
    await this.apiCall(url, { method: 'DELETE' });
  }

  /**
   * Run the sync algorithm:
   * Local IndexedDB <-> GDrive AppData
   */
  async sync(onProgress: (msg: string) => void): Promise<void> {
    onProgress('Fetching Google Drive index...');
    const remoteFiles = await this.listFiles();
    
    onProgress('Loading offline database...');
    const localDocs = await db.documents.toArray();

    const remoteMap = new Map<string, GDriveFileMetadata>();
    for (const f of remoteFiles) {
      if (f.appProperties?.id) {
        remoteMap.set(f.appProperties.id, f);
      }
    }

    const localMap = new Map<string, Document>();
    for (const d of localDocs) {
      localMap.set(d.id, d);
    }

    // Process all local files (Upload or Update)
    for (const localDoc of localDocs) {
      const remoteFile = remoteMap.get(localDoc.id);

      if (!remoteFile) {
        // Exists locally but not in Drive -> Upload
        onProgress(`Uploading new document: ${localDoc.title}...`);
        try {
          const res = await this.uploadFile(localDoc);
          await db.documents.update(localDoc.id, {
            gdriveId: res.gdriveId,
            gdriveVersion: res.version,
            isSynced: 1,
          });
        } catch (err) {
          console.error(`Failed uploading ${localDoc.title}`, err);
        }
      } else {
        // Exists in both places -> Check timestamps
        const remoteUpdatedAt = Number(remoteFile.appProperties?.updatedAt || '0');
        const localUpdatedAt = localDoc.updatedAt;

        if (localUpdatedAt > remoteUpdatedAt) {
          // Local is newer -> Upload updates
          onProgress(`Saving local updates to Drive: ${localDoc.title}...`);
          try {
            const version = await this.updateFile(remoteFile.id, localDoc);
            await db.documents.update(localDoc.id, {
              gdriveVersion: version,
              isSynced: 1,
            });
          } catch (err) {
            console.error(`Failed updating ${localDoc.title} on Drive`, err);
          }
        } else if (remoteUpdatedAt > localUpdatedAt) {
          // Drive is newer -> Download updates
          onProgress(`Downloading updates from Drive: ${localDoc.title}...`);
          try {
            const content = await this.downloadFileContent(remoteFile.id);
            const title = decodeURIComponent(remoteFile.appProperties?.title || remoteFile.name.replace('.md', ''));
            
            await db.documents.update(localDoc.id, {
              title,
              content,
              updatedAt: remoteUpdatedAt,
              revisionId: remoteFile.appProperties?.revisionId || localDoc.revisionId,
              gdriveVersion: String(remoteFile.modifiedTime || '1'),
              isSynced: 1,
            });
          } catch (err) {
            console.error(`Failed downloading ${localDoc.title} from Drive`, err);
          }
        } else {
          // Identical timestamps -> Mark as synced if not already
          if (localDoc.isSynced === 0) {
            await db.documents.update(localDoc.id, { isSynced: 1 });
          }
        }
      }
    }

    // Process remote files that don't exist locally (Download)
    for (const [id, remoteFile] of remoteMap.entries()) {
      if (!localMap.has(id)) {
        const title = decodeURIComponent(remoteFile.appProperties?.title || remoteFile.name.replace('.md', ''));
        onProgress(`Downloading new document: ${title}...`);
        
        try {
          const content = await this.downloadFileContent(remoteFile.id);
          const remoteUpdatedAt = Number(remoteFile.appProperties?.updatedAt || Date.now());
          
          const newDoc: Document = {
            id: id,
            title,
            content,
            createdAt: remoteUpdatedAt,
            updatedAt: remoteUpdatedAt,
            revisionId: remoteFile.appProperties?.revisionId || 'rev_initial',
            deviceId: remoteFile.appProperties?.deviceId || 'remote',
            isSynced: 1,
            gdriveId: remoteFile.id,
            gdriveVersion: String(remoteFile.modifiedTime || '1'),
          };

          await db.documents.add(newDoc);
        } catch (err) {
          console.error(`Failed importing ${remoteFile.name} from Drive`, err);
        }
      }
    }

    onProgress('Sync completed successfully!');
  }
}
