'use client';

import React, { useRef, useEffect } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';

export const MarkdownEditor: React.FC = () => {
  const { editorContent, updateActiveDocumentContent, isSaving } = useDocumentStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keep scroll synchronized on window resize or initial render
  useEffect(() => {
    handleScroll();
  }, [editorContent]);

  // Handle helper keystrokes like Tab indenting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newContent = 
        editorContent.substring(0, start) + 
        '  ' + 
        editorContent.substring(end);
      
      updateActiveDocumentContent(newContent);

      // Re-position selection cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lineCount = editorContent.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="relative flex flex-col h-full w-full bg-black/20 border-r border-white/5">
      {/* Editor top status bar */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-white/5 select-none shrink-0">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Markdown Source Editor
        </div>
        
        {/* Saving status indicator */}
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Editor body with scroll-synced line numbers */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Line Numbers column */}
        <div 
          ref={lineNumbersRef}
          className="select-none text-right py-4 pr-3 pl-4 text-slate-600 bg-black/15 font-mono text-sm leading-relaxed overflow-hidden w-12 shrink-0 border-r border-white/5"
        >
          {lineNumbers.map((num) => (
            <div key={num} className="h-6">
              {num}
            </div>
          ))}
        </div>

        {/* Text Input area */}
        <textarea
          ref={textareaRef}
          value={editorContent}
          onChange={(e) => updateActiveDocumentContent(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder="# Markdown Document&#10;&#10;Use headings, check-lists (- [ ] Task), tables, and mermaid diagrams!&#10;&#10;```mermaid&#10;graph TD&#10;  A --> B&#10;```"
          className="flex-1 h-full py-4 px-4 bg-transparent outline-none resize-none font-mono text-sm leading-relaxed text-slate-100 placeholder-slate-600 overflow-y-auto selection:bg-cyan-500/20 focus:outline-none"
          spellCheck="false"
        />
      </div>
    </div>
  );
};
