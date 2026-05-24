# 🚀 MarkFlow — Interactive Local-First Markdown PWA

MarkFlow is a production-grade, progressive web application (PWA) built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**. It provides a fully offline-capable, local-first editing workspace featuring real-time interactive checklist previews, Mermaid.js diagram compilation, and a fully hardened Google Drive REST sync engine with robust deletion tombstone reconciliation.

---

## ⚡ Core Technical Highlights

1. **AST-Driven Interactive Checklists:** Checklist checkboxes in the rendered HTML preview are live. Clicking one parses the raw markdown text to an **Abstract Syntax Tree (AST)**, updates the state, and compiles it back to markdown in real-time, keeping markdown as the absolute single source of truth.
2. **Offline-First & Debounced Autosave (Dexie.js):** All documents, history, and user settings are stored locally in the browser's **IndexedDB** using Dexie.js. Local state changes update instantly in the UI, with high-frequency database operations protected by a debounced background thread.
3. **Google Drive REST Sync & Tombstone Engine:** Directly synchronizes local notes with a secure, hidden `appDataFolder` in the user's Google Account. Includes a custom **deletion tombstone algorithm** to ensure local note deletions are propagated to the cloud rather than getting restored.
4. **Onboarding Welcome Note Safeguard:** Tracks app onboarding lifecycle. Prevents deleted welcome notes from ghosting back when the database is empty.
5. **Security Hardening:** Fully audited package dependencies with **zero vulnerabilities** achieved using strict package overrides.
6. **Ultra-Clean Glassmorphic Aesthetics:** Refined, space-saving sidebar with direct social connectivity (GitHub, LinkedIn, Email), PWA app icon branding, and rich micro-animations.

---

## 📁 Workspace Architecture Layout

* `/app/layout.tsx`: Configures standard PWA manifests, page metadata, and font files.
* `/app/page.tsx`: Single Page Application (SPA) dashboard housing sidebar navigators, settings, and workspaces.
* `/components/`:
  * `MarkdownEditor`: Monospace editor with line numbers and custom tab indentation helpers.
  * `MarkdownPreview`: unified AST parser converting markdown to interactive components and glassmorphic tables.
  * `MermaidRenderer`: Lazy-loaded, sandboxed diagram compiler with graceful compilation error handling.
  * `FileUploader`: Drag & drop markdown importer leveraging `react-dropzone`.
  * `SyncStatus`: Google API authorization widget and status reporter.
* `/db/dexie.ts`: Dexie.js client-side database schema and preferences setup.
* `/lib/`:
  * `markdown.ts`: unified and rehype AST manipulation utilities.
  * `sync.ts`: Google Drive file comparison, change propagation, and deletion tombstone sync engine.
* `/store/useDocumentStore.ts`: Zustand global state container with autosave timeouts and document actions.

---

## 🛠️ Local Development & Operations

### Prerequisites
* Node.js v18.x or newer
* npm package manager

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Development Mode
Run the hot-reloading development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 3. Production Compilation
Verify, build, and run the production-optimized build:
```bash
npm run build
npm run start
```

---

## ☁️ Configuring Google Drive Cloud Sync

To set up the cloud sync integration:
1. Navigate to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create a project, enable the **Google Drive API**.
3. Configure the **OAuth Consent Screen**:
   * Application Type: *External*.
   * Add scopes: `.../auth/drive.appdata`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`.
   * Add your Google test accounts under *Test users*.
4. Go to **Credentials** -> **Create Credentials** -> **OAuth Client ID**:
   * Application Type: *Web Application*.
   * Authorized JavaScript Origins: Add `http://localhost:3000` (and your production domain).
5. Paste the generated **Client ID** inside the app Settings card in the sidebar and click **Connect Google Drive** to authorize!
