'use client';

import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { MermaidRenderer } from '@/components/MermaidRenderer';
import { useDocumentStore } from '@/store/useDocumentStore';
import { toggleCheckboxInMarkdown } from '@/lib/markdown';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { editorContent, updateActiveDocumentContent } = useDocumentStore();

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Check if clicked target is a checkbox input
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      e.preventDefault(); // Prevent standard toggle browser behavior
      
      if (!previewRef.current) return;
      
      // Get all interactive checkboxes in the rendered DOM in depth-first order
      const checkboxes = Array.from(
        previewRef.current.querySelectorAll('input[type="checkbox"]')
      );
      
      const index = checkboxes.indexOf(target as HTMLInputElement);
      if (index !== -1) {
        // Toggle in markdown source
        const newMarkdown = toggleCheckboxInMarkdown(editorContent || content, index);
        updateActiveDocumentContent(newMarkdown);
      }
    }
  };

  // Custom styling elements for react-markdown
  const components = {
    // Fenced code blocks & Mermaid blocks
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      const codeString = String(children).replace(/\n$/, '');

      if (!isInline && match[1] === 'mermaid') {
        return <MermaidRenderer code={codeString} theme="dark" />;
      }

      if (isInline) {
        return (
          <code 
            className="px-1.5 py-0.5 rounded-md border border-white/5 bg-white/5 text-cyan-300 font-mono text-sm"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="relative my-4 overflow-hidden rounded-xl border border-white/5 bg-black/40 backdrop-blur-md shadow-xl group">
          <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-white/5 text-xs text-slate-400 font-mono select-none">
            <span>{match ? match[1] : 'code'}</span>
            <button 
              onClick={() => navigator.clipboard.writeText(codeString)}
              className="text-cyan-400/80 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-sm text-slate-200 font-mono leading-relaxed">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    },

    // Checklist checkboxes
    input({ node, ...props }: any) {
      if (props.type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={props.checked}
            readOnly
            className="w-4.5 h-4.5 rounded border-white/20 bg-black/30 text-cyan-400 focus:ring-cyan-500/20 focus:ring-2 focus:ring-offset-0 mr-2 cursor-pointer transition-all duration-150 inline-block align-middle"
          />
        );
      }
      return <input {...props} />;
    },

    // Heading tags
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 mt-8 mb-4">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-bold tracking-tight text-slate-100 mt-6 mb-3 pb-1 border-b border-white/5">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold text-cyan-300 mt-5 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-lg font-medium text-slate-200 mt-4 mb-2">
        {children}
      </h4>
    ),

    // Paragraphs
    p: ({ children }: any) => (
      <p className="text-base text-slate-300 leading-relaxed my-3 font-normal">
        {children}
      </p>
    ),

    // Hyperlinks
    a: ({ href, children }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium underline decoration-cyan-400/30 hover:decoration-cyan-400 decoration-2 underline-offset-2"
      >
        {children}
      </a>
    ),

    // Quotes
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-cyan-500/80 bg-cyan-950/10 backdrop-blur-md rounded-r-xl px-4 py-3 my-4 italic text-slate-400">
        {children}
      </blockquote>
    ),

    // Lists
    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 my-3 space-y-1.5 text-slate-300">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 my-3 space-y-1.5 text-slate-300">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),

    // Tables
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-6 border border-white/5 rounded-xl bg-black/20 shadow-lg">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-white/5 text-left font-semibold text-slate-300 select-none">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-white/5 bg-transparent text-slate-300">
        {children}
      </tbody>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-white/5 transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-3 text-left font-medium border-b border-white/5">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 whitespace-nowrap text-slate-300">
        {children}
      </td>
    ),
  };

  return (
    <div 
      ref={previewRef}
      onClick={handlePreviewClick}
      className="markdown-body h-full w-full overflow-y-auto px-6 py-6 pb-24 text-slate-300 max-w-none"
    >
      {content ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 font-sans select-none">
          <svg className="w-16 h-16 opacity-30 mb-4 animate-bounce text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-lg font-medium text-slate-400">Empty Document</span>
          <span className="text-sm mt-1 text-slate-500">Add markdown to see interactive preview</span>
        </div>
      )}
    </div>
  );
};
