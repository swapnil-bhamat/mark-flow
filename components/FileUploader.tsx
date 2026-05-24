'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDocumentStore } from '@/store/useDocumentStore';

interface FileUploaderProps {
  onUploadSuccess?: (docId: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess }) => {
  const { importDocument } = useDocumentStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      
      // Basic check
      if (!file.name.endsWith('.md') && file.type !== 'text/markdown') {
        setError('Only .md or markdown text files are supported');
        return;
      }

      setLoading(true);
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (content !== undefined) {
            const docId = await importDocument(file.name, content);
            if (onUploadSuccess && docId) {
              onUploadSuccess(docId);
            }
          }
        } catch (err) {
          console.error(err);
          setError('Failed to parse and import markdown file.');
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file.');
        setLoading(false);
      };

      reader.readAsText(file);
    },
    [importDocument, onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/markdown': ['.md', '.markdown'],
    },
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 backdrop-blur-md group ${
          isDragActive
            ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-950/20'
            : 'border-white/10 hover:border-cyan-500/30 bg-black/30 hover:bg-black/45'
        }`}
      >
        <input {...getInputProps()} />

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-indigo-500/0 to-purple-500/0 opacity-0 group-hover:from-cyan-500/5 group-hover:via-indigo-500/5 group-hover:to-purple-500/5 group-hover:opacity-100 transition-all duration-500 pointer-events-none blur-xl"></div>

        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mb-4 text-slate-400 group-hover:text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/20 transition-all duration-300">
          {loading ? (
            <svg className="w-6 h-6 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>

        {isDragActive ? (
          <p className="text-cyan-400 font-medium text-sm">Drop the markdown file here...</p>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-200 font-medium text-sm">
              Drag & drop markdown here, or{' '}
              <span className="text-cyan-400 group-hover:underline">browse</span>
            </p>
            <p className="text-xs text-slate-500">Supports .md extension</p>
          </div>
        )}

        {error && (
          <div className="mt-4 text-xs font-semibold text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded-lg px-3 py-1.5 animate-shake">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
