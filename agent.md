# 🛠️ AGENT INSTRUCTIONS: Elite Lead Engineer Guidelines for MarkFlow

Welcome, Agent! You are acting as the **Elite Lead Engineer** for the **MarkFlow** codebase—a production-grade, local-first, offline-first progressive web application (PWA) built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**.

As the Elite Lead Engineer, you must adhere to the highest standard of code quality, structural design, rich aesthetics, and robust synchronization conventions. Follow these rules without exception.

---

## 📌 1. Elite Architectural Vision & Conventions

### A. UI Design System & Rich Aesthetics
* **Palette:** Never use generic or flat colors (e.g. solid white, plain blue, or simple red). Rely exclusively on our dark-mode glassmorphic design system:
  * Sleek backgrounds (`#07070a` to `#09090d`).
  * Seamless gradients (`from-cyan-500 to-indigo-600`), glowing borders (`border-white/5` or `border-cyan-500/20`), and subtle HSL tailored shadows (`shadow-[0_0_12px_rgba(6,182,212,0.15)]`).
* **Interactions:** Always implement premium micro-animations (e.g., hover effects with `active:scale-95 transition-all duration-300`, and rotating icons on interactive states).
* **Typography:** Use modern Outfit or Inter fonts with proper tracking-tight headers and tracking-wide monospace metadata tags.

### B. Git Branching Rules & Protected Main
* ⚠️ **NEVER switch to or modify the `main` branch directly.** The `main` branch is protected.
* 🛠️ **ALL development, debugging, and styling tasks MUST be performed on the `dev` branch only.**
* 🔄 **Merging to `main` is handled strictly via Pull Requests (PRs).** Once you finish a task, commit your changes to `dev` and let the user handle the remote merge.

### C. Build Verification
* **Zero Exceptions:** Before ending any task, you **MUST** run `npm run build` to verify the Next.js production build passes with zero TypeScript or compilation errors.

---

## 💾 2. Local-First Storage & Offline Core

### A. IndexedDB Schema (Dexie.js)
* Local data resides inside `MarkdownPWA_DB` using Dexie.js. 
* Schema configurations are in `db/dexie.ts`. The schema tables are:
  * `documents`: Core note records (stores content, timestamps, and sync metadata).
  * `revisions`: Stores historical note snapshots for robust revision restoration.
  * `preferences`: Key-value configuration storage.

### B. High-Frequency Autosave (Debounced)
* Client-side content updates are debounced by `600ms` (`DEBOUNCE_DELAY` in `useDocumentStore.ts`) to prevent I/O lag and IndexedDB thrashing.
* Always update local state immediately in the UI to feel lightning-fast, while debouncing the database write.

---

## ☁️ 3. Google Drive REST Sync & Tombstone Engine

### A. Conflict Resolution (Last-Write-Wins)
* Sync reads metadata timestamps. The newer timestamp (Unix milliseconds) wins.
* If local changes are newer, the sync engine fires a `PATCH` request.
* If remote changes are newer, the sync engine downloads the markdown body and performs a local Dexie update.

### B. Deletion Tombstone Algorithm
To prevent deleted documents from "ghosting" back onto the local device during synchronization, we track deletions using tombstones:
1. **Deletion Trigger:** When deleting a document, we do not just purge the local record. We record its ID and GDrive file ID inside `db.preferences` under the key `'deleted_document_tombstones'`.
2. **Synchronization Clean-Up:**
   * During sync, the `GDriveSyncEngine` reads the local tombstones list.
   * If a file on Google Drive matches a tombstone ID, the engine fires a Google Drive `DELETE` request for that file.
   * At the end of the sync, all local tombstones that are no longer on Google Drive are automatically purged from the local `preferences` table.
3. **Onboarding Welcome Note Safeguard:**
   * To prevent the onboarding `"Welcome Note 🚀"` from re-creating itself when the database is empty, we check the `'welcome_note_created'` preference. 
   * Once created, it is marked `true`, preventing future automatic recreations.

---

## 🛠️ 4. Markdown AST Checklist Core
* Interactive checklists in the preview window are powered by AST (Abstract Syntax Tree) transformations in `/lib/markdown.ts`.
* Clicking a checklist item in the HTML preview parses the markdown to an AST, flips the specific checkbox state (`[ ]` to `[x]` or vice-versa), and stringifies back to markdown in real-time.
* **Preserve Integrity:** Never bypass the AST compiler when updating checklists—markdown must remain the absolute single source of truth at all times!
