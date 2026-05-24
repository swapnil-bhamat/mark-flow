# 🚀 Interactive Markdown PWA — Obsidian-Lite Workspace

A production-grade, progressive web application (PWA) built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**. It enables a local-first, offline-capable editing workspace with real-time interactive checklist rendering, Google Drive sync, and seamless import/export operations.

---

## ⚡ Core Highlights

1. **AST-Driven Interactive Checklists**: Checkboxes are interactive inside the rendered HTML preview. Clicking a checkbox parses the markdown to an Abstract Syntax Tree (AST) using Unified, toggles the state, and stringifies back to markdown in real-time, preserving markdown as the single source of truth.
2. **Offline-First via Dexie.js**: All notes, metadata, and history are stored locally inside **IndexedDB** using Dexie.js. Features high-frequency debounced autosaving.
3. **Google Drive REST Sync Engine**: Browser-direct cloud sync that securely connects to the user's Google Account and backups notes in a secure, hidden `appDataFolder` using Google REST APIs. Conflict resolution implements "last-write-wins" based on Unix timestamps.
4. **Mermaid.js Flowchart Support**: Fully integrated support for fenced `mermaid` code blocks with lazy rendering, light/dark theme compliance, and grace-recovery compile error handles.
5. **Fluid PWA Actions**: Pre-cached static shells and Stale-While-Revalidate network strategies ensure instant loads and 100% offline usage.

---

## 📁 Architecture Layout

- `/app/layout.tsx`: Links standard PWA manifests and manages fonts.
- `/app/page.tsx`: Single Page Application (SPA) dashboard containing responsive grid panels and drawers.
- `/components/`:
  - `MarkdownEditor`: Monospace textarea with scroll-synchronized line numbers and keyboard-tab spacing helpers.
  - `MarkdownPreview`: HTML parser leveraging unified ecosystem, rendering interactive checkboxes and custom headings.
  - `MermaidRenderer`: Lazy-loaded, sandboxed diagram engine.
  - `FileUploader`: Drag & drop importer utilizing `react-dropzone`.
  - `SyncStatus`: Client-side Google Identity connection panel.
- `/db/dexie.ts`: Local schema configuration.
- `/lib/`:
  - `markdown.ts`: AST-based checklist manipulation.
  - `sync.ts`: Google Drive file-comparer engine.
- `/store/useDocumentStore.ts`: Global state container with debounced saves.

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js version 18.x or newer
- npm package manager

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Running in Development
Fire up the local development web server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the workspace!

### 3. Production Build Compilation
Build the production bundle and run the server locally:
```bash
npm run build
npm run start
```

---

## ☁️ Setting up Google Drive Sync

To enable the cloud synchronization engine:
1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create a new project, navigate to **APIs & Services**, and enable the **Google Drive API**.
3. Go to **OAuth Consent Screen**:
   - Set User Type to *External*.
   - Add the scopes: `.../auth/drive.appdata`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`.
   - Add your test Google accounts under "Test users".
4. Go to **Credentials** -> **Create Credentials** -> **OAuth Client ID**:
   - Application Type: *Web Application*.
   - Authorized JavaScript Origins: Add `http://localhost:3000` (and your production domain).
   - Click Create and copy the generated **Client ID**.
5. In the app sidebar, click the **Settings (gear icon)** inside the GDrive Cloud Sync card, paste your Client ID, save, and click **Connect Google Drive** to authorize!
