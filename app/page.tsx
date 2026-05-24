'use client';

import React, { useEffect, useState } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { FileUploader } from '@/components/FileUploader';
import { SyncStatus } from '@/components/SyncStatus';

export default function WorkspacePage() {
  const {
    documents,
    activeDocId,
    activeDoc,
    editorContent,
    searchQuery,
    taskStats,
    loadDocuments,
    selectDocument,
    createNewDocument,
    updateActiveDocumentTitle,
    deleteDocument,
    setSearchQuery,
    exportActiveDocument,
    gdriveAuthenticated,
    gdriveSyncInProgress,
  } = useDocumentStore();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Initialize DB and register PWA Service Worker on mount
  useEffect(() => {
    loadDocuments();

    // Register vanilla service worker for full offline functionality
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      let intervalId: NodeJS.Timeout;
      
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully:', reg.scope);
            
            // 1. Check for service worker updates immediately on mount
            reg.update().catch((e) => console.log('[PWA] Immediate update check failed:', e));

            // 2. Set up check on window focus (app returning from background)
            const handleFocus = () => {
              reg.update().catch((e) => console.log('[PWA] Focus update check failed:', e));
            };
            window.addEventListener('focus', handleFocus);

            // 3. Set up periodic check (every 5 minutes)
            intervalId = setInterval(() => {
              reg.update().catch((e) => console.log('[PWA] Periodic update check failed:', e));
            }, 5 * 60 * 1000);

            // 4. Listen for update found (new service worker is installing)
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setUpdateAvailable(true);
                  }
                });
              }
            });

            return () => {
              window.removeEventListener('focus', handleFocus);
              if (intervalId) clearInterval(intervalId);
            };
          })
          .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
      };

      // Listen for when a new service worker actually takes control (after skipWaiting + clients.claim)
      const handleControllerChange = () => {
        setUpdateAvailable(true);
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [loadDocuments]);

  // Filter documents based on search query
  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = async () => {
    const newId = await createNewDocument();
    setMobileSidebarOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      await deleteDocument(id);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#07070a] text-slate-100 font-sans h-full w-full overflow-hidden relative">
      {/* BACKGROUND EFFECTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* SIDEBAR - DESKTOP & MOBILE DRAWER */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-black/60 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300 ease-out md:static shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <img 
              src="/icons/icon-192.png" 
              alt="MarkFlow Logo" 
              className="w-8 h-8 rounded-xl shadow-lg shadow-cyan-500/20 object-cover"
            />
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                MarkFlow
              </h1>
            </div>
          </div>

          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-1 p-4 flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Create New & Import action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCreateNew}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold py-2 px-3 rounded-xl text-xs shadow-lg shadow-cyan-500/10 cursor-pointer transition-all duration-300 active:scale-95 group"
            >
              <svg className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v8m0 0v8m0-8h8m-8 0H4" />
              </svg>
              New Note
            </button>

            <button
              onClick={() => setShowUploader(!showUploader)}
              className={`p-2 border rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                showUploader 
                  ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400' 
                  : 'border-white/10 hover:border-white/20 bg-white/5 text-slate-300'
              }`}
              title="Import file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
          </div>

          {/* Import Dropzone panel */}
          {showUploader && (
            <div className="animate-slideDown">
              <FileUploader
                onUploadSuccess={(docId) => {
                  setShowUploader(false);
                  selectDocument(docId);
                }}
              />
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/5 transition-all"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Task Progress Bar (only shown if a document is selected) */}
          {activeDoc && taskStats.total > 0 && (
            <div className="p-3.5 rounded-2xl border border-white/5 bg-white/5 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Active checklist</span>
                <span className="font-mono text-cyan-400 font-bold">{taskStats.percent}%</span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-[1px] border border-white/5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all duration-500 ease-out" 
                  style={{ width: `${taskStats.percent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 text-right">
                {taskStats.completed} of {taskStats.total} items completed
              </span>
            </div>
          )}

          {/* Documents list */}
          <div className="flex flex-col gap-1.5 min-h-0 flex-1 overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none mb-1">
              Documents ({filteredDocs.length})
            </span>
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => {
                  const isActive = doc.id === activeDocId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        selectDocument(doc.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`flex justify-between items-center px-3.5 py-3 rounded-xl cursor-pointer group transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-950/45 to-indigo-950/45 border border-cyan-500/20 text-cyan-200'
                          : 'border border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 truncate flex-1 pr-2">
                        <span className="text-xs font-semibold truncate leading-normal">{doc.title}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(doc.updatedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDelete(e, doc.id)}
                        className="opacity-65 md:opacity-0 md:group-hover:opacity-100 hover:text-rose-400 text-slate-500 p-1 cursor-pointer transition-all duration-250 hover:opacity-100"
                        title="Delete note"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-600 text-xs select-none">
                  No notes found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer - Social Links */}
        <div className="p-4 border-t border-white/5 bg-white/2 backdrop-blur-md flex items-center gap-3 justify-center shrink-0 select-none">
          <a
            href="https://github.com/swapnil-bhamat/mark-flow"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-all duration-300 active:scale-95 group"
            title="GitHub Repository"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/swapnil-bhamat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-[#0a66c2] hover:border-[#0a66c2]/30 hover:bg-[#0a66c2]/5 hover:shadow-[0_0_12px_rgba(10,102,194,0.15)] transition-all duration-300 active:scale-95 group"
            title="LinkedIn Profile"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </a>
          <a
            href="mailto:swapnil.p.bhamat@gmail.com"
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-all duration-300 active:scale-95 group"
            title="Email Developer"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        </div>

      </aside>

      {/* MOBILE DRAWER BACKDROP */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* MAIN WORKSPACE AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Workspace Toolbar/Header */}
        <header className="px-6 py-3 border-b border-white/5 bg-black/45 backdrop-blur-md flex justify-between items-center shrink-0">
          {/* Document details */}
          <div className="flex items-center gap-3 truncate">
            {/* Sidebar toggle button for mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg border border-white/10 bg-white/5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {activeDoc ? (
              <div className="flex items-center gap-2 truncate">
                <input
                  type="text"
                  value={activeDoc.title}
                  onChange={(e) => updateActiveDocumentTitle(e.target.value)}
                  className="bg-transparent border-none text-sm md:text-base font-bold text-slate-100 focus:outline-none focus:ring-0 truncate min-w-[120px] max-w-[280px] p-0.5 rounded focus:bg-white/5 focus:px-2 hover:bg-white/5 hover:px-2 transition-all cursor-pointer"
                  title="Click to rename"
                />
                
                {/* Download note button */}
                <button
                  onClick={exportActiveDocument}
                  className="text-slate-400 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
                  title="Download Markdown file"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            ) : (
              <span className="text-sm font-semibold text-slate-500">No Document Active</span>
            )}
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3 shrink-0 select-none">
            {/* Google Drive Sync Button */}
            <button
              onClick={() => setShowSyncModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-300 ${
                gdriveSyncInProgress
                  ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                  : gdriveAuthenticated
                  ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/25 hover:border-emerald-500/35'
                  : 'border-white/10 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white'
              }`}
              title="Cloud Sync Settings"
            >
              {gdriveSyncInProgress ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : gdriveAuthenticated ? (
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              )}
              <span className="hidden sm:inline">
                {gdriveSyncInProgress ? 'Syncing...' : gdriveAuthenticated ? 'Cloud Synced' : 'Sync'}
              </span>
            </button>

            {/* View layout switch tabs */}
            <div className="flex bg-black/40 border border-white/10 rounded-xl p-0.5">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Editor View"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden md:inline">Editor</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Preview View"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="hidden md:inline">Preview</span>
              </button>
            </div>
          </div>
        </header>

        {/* WORKSPACE BODY - SPLIT PANE OR MOBILE TAB */}
        {activeDocId ? (
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            {/* Toggle: Edit Tab */}
            <div
              className={`flex-1 h-full overflow-hidden ${
                activeTab === 'edit' ? 'block' : 'hidden'
              }`}
            >
              <MarkdownEditor />
            </div>

            {/* Toggle: Preview Tab */}
            <div
              className={`flex-1 h-full overflow-hidden border-l border-white/5 bg-gradient-to-b from-[#09090d] to-[#050507] ${
                activeTab === 'preview' ? 'block' : 'hidden'
              }`}
            >
              <MarkdownPreview content={editorContent} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-sans select-none bg-black/20">
            <svg className="w-16 h-16 opacity-20 mb-4 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-base font-semibold text-slate-400">Select or Create a Document</span>
            <span className="text-xs mt-1 text-slate-500">Choose a markdown file from the sidebar to begin editing</span>
          </div>
        )}
      </main>
      {/* GOOGLE DRIVE SYNC MODAL DIALOG */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all duration-300">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowSyncModal(false)} />
          <div className="relative w-full max-w-md mx-auto shadow-2xl">
            <SyncStatus onClose={() => setShowSyncModal(false)} />
          </div>
        </div>
      )}

      {/* PWA UPDATE TOAST */}
      {updateAvailable && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-slideUp">
          <div className="bg-[#0b0b14]/90 backdrop-blur-xl border border-cyan-500/35 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-cyan-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.23" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-100">Update Available</span>
                <span className="text-[10px] text-slate-400">A new version of MarkFlow is ready.</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] shadow-md shadow-cyan-500/10 cursor-pointer transition-all duration-300 active:scale-95 whitespace-nowrap"
              >
                Update Now
              </button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="text-slate-500 hover:text-slate-300 text-[10px] px-2 font-medium cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
