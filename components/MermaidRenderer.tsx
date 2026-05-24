'use client';

import React, { useEffect, useState, useRef } from 'react';

let mermaidInitialized = false;

interface MermaidRendererProps {
  code: string;
  theme?: 'dark' | 'light';
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, theme = 'dark' }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const elementId = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'neutral',
            securityLevel: 'loose',
            fontFamily: 'var(--font-geist-mono), monospace',
            themeVariables: {
              background: '#0a0a0c',
              primaryColor: '#1e1b4b',
              primaryTextColor: '#f8fafc',
              lineColor: '#6366f1',
            }
          });
          mermaidInitialized = true;
        } else {
          // Re-initialize theme config dynamically
          mermaid.initialize({
            theme: theme === 'dark' ? 'dark' : 'neutral',
          });
        }

        setError(null);
        
        // Clean render using mermaid.render
        const cleanCode = code.trim();
        const { svg: renderedSvg } = await mermaid.render(elementId.current, cleanCode);
        
        if (active) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (active) {
          setError(err.message || 'Syntax error in Mermaid diagram');
        }
        
        // Recover mermaid parser state by inserting a clean node if it gets locked
        try {
          const badge = document.getElementById(elementId.current);
          if (badge) badge.remove();
        } catch (e) {}
      }
    };

    renderDiagram();

    return () => {
      active = false;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="my-4 p-4 border border-rose-500/20 bg-rose-950/20 backdrop-blur-md rounded-xl text-rose-300 font-mono text-sm leading-relaxed overflow-x-auto shadow-lg shadow-rose-950/10">
        <div className="flex items-center gap-2 mb-2 text-rose-400 font-semibold">
          <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Mermaid Render Error
        </div>
        <pre className="whitespace-pre-wrap">{error}</pre>
        <pre className="mt-2 text-xs text-rose-400/60 select-none">{code}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="my-6 p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md flex justify-center items-center overflow-x-auto shadow-xl transition-all duration-300 hover:border-cyan-500/10 hover:shadow-cyan-950/5 group"
      dangerouslySetInnerHTML={{ __html: svg || '<div class="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-cyan-400 animate-spin"></div>' }}
    />
  );
};
