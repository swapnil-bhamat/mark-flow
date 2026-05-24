import { create } from 'zustand';
import { db, type Document, type Revision } from '@/db/dexie';
import { saveAs } from 'file-saver';
import { getMarkdownTaskStats } from '@/lib/markdown';

interface DocumentStore {
  documents: Document[];
  activeDocId: string | null;
  activeDoc: Document | null;
  editorContent: string;
  isSaving: boolean;
  searchQuery: string;
  taskStats: { completed: number; total: number; percent: number };

  // Google Drive state
  gdriveAuthenticated: boolean;
  gdriveUserEmail: string | null;
  gdriveSyncInProgress: boolean;
  syncStatusMessage: string;

  // Actions
  loadDocuments: () => Promise<void>;
  selectDocument: (id: string | null) => Promise<void>;
  createNewDocument: (title?: string, content?: string) => Promise<string>;
  updateActiveDocumentContent: (content: string) => Promise<void>;
  updateActiveDocumentTitle: (title: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  importDocument: (name: string, content: string) => Promise<string>;
  exportActiveDocument: () => void;

  // Sync related actions
  setGDriveAuth: (authenticated: boolean, email: string | null) => void;
  setGDriveSyncState: (syncing: boolean, message: string) => void;
}

let saveTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_DELAY = 600; // ms

// Device ID is preserved in localStorage or created
const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server';
  let devId = localStorage.getItem('pwa_device_id');
  if (!devId) {
    devId = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('pwa_device_id', devId);
  }
  return devId;
};

const WELCOME_CONTENT = `# Welcome to Markdown PWA 🚀

This is a production-grade, client-side, offline-first progressive web application designed for editing and interacting with Markdown. 

## ⚡ Core Features

- [ ] **Interactive Checklists**: Click on task items in the right-hand preview panel! The source markdown updates instantly and saves automatically.
- [ ] **Mermaid Diagrams**: Visualise workflows using standard Mermaid markup blocks.
- [ ] **Offline First**: Documents are saved instantly in your local browser using **IndexedDB** (via Dexie.js).
- [ ] **Google Drive Sync**: Connect your own Google account and securely sync files to a hidden AppData folder.
- [ ] **PWA Capabilities**: Install this app on your phone or desktop to access your notes fully offline.

---

## 🛠️ Interactive Task Board

Try ticking off the checklist items below in the rendered preview:

- [ ] Connect Google Drive sync in the sidebar ☁️
- [ ] Export this file as \`.md\` to test download 📥
- [ ] Create a new note using the sidebar action 📝
- [ ] Write a custom Mermaid flowchart 📊

---

## 📊 Live Flowchart Example

Below is a live Mermaid rendering of our synchronisation engine workflow. Try changing the text in the editor!

\`\`\`mermaid
graph TD
  LocalDB[(IndexedDB)] <--> Sync[Sync Engine]
  Sync <--> GDrive[Google Drive Cloud]
  style LocalDB fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
  style GDrive fill:#0f172a,stroke:#06b6d4,stroke-width:2px,color:#fff
  style Sync fill:#172554,stroke:#3b82f6,stroke-width:2px,color:#fff
\`\`\`

## 📝 Markdown Elements

Tables render in clean, elegant glassmorphic grids:

| Tool | Purpose | Tech |
| :--- | :--- | :--- |
| **Dexie** | IndexedDB wrapper | Local Storage |
| **Unified** | AST Parser | Compiler |
| **Mermaid** | Dynamic SVG Diagrams | Vector Renderer |

> [!TIP]
> Keep your formatting consistent to enjoy flawless AST transformations. The markdown code remains the single source of truth at all times!

Enjoy writing and organizing!
`;

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  activeDocId: null,
  activeDoc: null,
  editorContent: '',
  isSaving: false,
  searchQuery: '',
  taskStats: { completed: 0, total: 0, percent: 0 },

  gdriveAuthenticated: false,
  gdriveUserEmail: null,
  gdriveSyncInProgress: false,
  syncStatusMessage: '',

  loadDocuments: async () => {
    try {
      let docs = await db.documents.toArray();
      
      // Auto-create onboarding document if DB is empty
      if (docs.length === 0) {
        const welcomeId = await get().createNewDocument(
          'Welcome Note 🚀',
          WELCOME_CONTENT
        );
        docs = await db.documents.toArray();
      }

      // Sort by updatedAt descending
      docs.sort((a, b) => b.updatedAt - a.updatedAt);
      
      set({ documents: docs });

      // If there is an active doc, make sure to refresh it
      const { activeDocId } = get();
      if (activeDocId) {
        const active = docs.find((d) => d.id === activeDocId);
        if (active) {
          set({ 
            activeDoc: active, 
            taskStats: getMarkdownTaskStats(active.content) 
          });
        }
      } else if (docs.length > 0) {
        // Auto-select the first document on initial load
        await get().selectDocument(docs[0].id);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  },

  selectDocument: async (id: string | null) => {
    if (!id) {
      set({ activeDocId: null, activeDoc: null, editorContent: '', taskStats: { completed: 0, total: 0, percent: 0 } });
      return;
    }

    try {
      const doc = await db.documents.get(id);
      if (doc) {
        set({
          activeDocId: id,
          activeDoc: doc,
          editorContent: doc.content,
          taskStats: getMarkdownTaskStats(doc.content),
        });
      }
    } catch (error) {
      console.error('Failed to select document:', error);
    }
  },

  createNewDocument: async (title = 'Untitled Note', content = '# Untitled Note\n\nStart writing here...') => {
    const newId = 'doc_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const now = Date.now();
    const newDoc: Document = {
      id: newId,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      revisionId: 'rev_' + Math.random().toString(36).substring(2, 15),
      deviceId: getDeviceId(),
      isSynced: 0,
    };

    try {
      await db.documents.add(newDoc);
      
      // Save initial revision
      const rev: Revision = {
        id: 'rev_' + Math.random().toString(36).substring(2, 15),
        docId: newId,
        content,
        timestamp: now,
      };
      await db.revisions.add(rev);

      await get().loadDocuments();
      await get().selectDocument(newId);
      
      return newId;
    } catch (error) {
      console.error('Failed to create new document:', error);
      return '';
    }
  },

  updateActiveDocumentContent: async (content: string) => {
    const { activeDocId, activeDoc } = get();
    if (!activeDocId || !activeDoc) return;

    // 1. Instantly update UI state for maximum fluid responsiveness
    set({ 
      editorContent: content,
      taskStats: getMarkdownTaskStats(content) 
    });

    // 2. Debounced save to IndexedDB (prevent high I/O lag)
    if (saveTimeout) clearTimeout(saveTimeout);
    
    set({ isSaving: true });

    saveTimeout = setTimeout(async () => {
      try {
        const now = Date.now();
        const updatedDoc: Document = {
          ...activeDoc,
          content,
          updatedAt: now,
          revisionId: 'rev_' + Math.random().toString(36).substring(2, 15),
          isSynced: 0, // Mark as dirty/unsynced for GDrive
        };

        await db.documents.put(updatedDoc);

        // Periodically save revisions (e.g. if content length differs by >50 chars, or every 5 mins)
        // For simplicity, let's save a revision for major updates, or we can save one if no revisions in last 2 mins
        const lastRev = await db.revisions
          .where('docId')
          .equals(activeDocId)
          .sortBy('timestamp');
        
        const latest = lastRev[lastRev.length - 1];
        if (!latest || Math.abs(latest.content.length - content.length) > 100 || now - latest.timestamp > 120000) {
          await db.revisions.add({
            id: 'rev_' + Math.random().toString(36).substring(2, 15),
            docId: activeDocId,
            content,
            timestamp: now,
          });
        }

        set({ activeDoc: updatedDoc });
        await get().loadDocuments(); // Refresh sidebar list
      } catch (error) {
        console.error('Failed to auto-save document:', error);
      } finally {
        set({ isSaving: false });
      }
    }, DEBOUNCE_DELAY);
  },

  updateActiveDocumentTitle: async (title: string) => {
    const { activeDocId, activeDoc } = get();
    if (!activeDocId || !activeDoc) return;

    try {
      const now = Date.now();
      const updatedDoc = {
        ...activeDoc,
        title,
        updatedAt: now,
        revisionId: 'rev_' + Math.random().toString(36).substring(2, 15),
        isSynced: 0,
      };

      await db.documents.put(updatedDoc);
      set({ activeDoc: updatedDoc });
      await get().loadDocuments();
    } catch (error) {
      console.error('Failed to update document title:', error);
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await db.documents.delete(id);
      // Clean up revisions
      await db.revisions.where('docId').equals(id).delete();
      
      const { activeDocId } = get();
      if (activeDocId === id) {
        set({ activeDocId: null, activeDoc: null, editorContent: '', taskStats: { completed: 0, total: 0, percent: 0 } });
      }

      await get().loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  importDocument: async (name: string, content: string) => {
    // Strip extension for title
    const title = name.endsWith('.md') ? name.slice(0, -3) : name;
    return await get().createNewDocument(title, content);
  },

  exportActiveDocument: () => {
    const { activeDoc } = get();
    if (!activeDoc) return;

    const blob = new Blob([activeDoc.content], { type: 'text/markdown;charset=utf-8' });
    const filename = `${activeDoc.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    saveAs(blob, filename);
  },

  setGDriveAuth: (authenticated: boolean, email: string | null) => {
    set({ gdriveAuthenticated: authenticated, gdriveUserEmail: email });
  },

  setGDriveSyncState: (syncing: boolean, message: string) => {
    set({ gdriveSyncInProgress: syncing, syncStatusMessage: message });
  },
}));
