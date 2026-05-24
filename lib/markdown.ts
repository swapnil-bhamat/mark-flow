import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';

export interface TaskStats {
  completed: number;
  total: number;
  percent: number;
}

/**
 * Parses markdown and counts completed vs total task checklist items.
 */
export function getMarkdownTaskStats(markdown: string): TaskStats {
  try {
    const processor = unified().use(remarkParse).use(remarkGfm);
    const ast = processor.parse(markdown);
    let completed = 0;
    let total = 0;

    function walk(n: any) {
      if (n.type === 'listItem' && typeof n.checked === 'boolean') {
        total++;
        if (n.checked) {
          completed++;
        }
      }
      if (n.children) {
        for (const child of n.children) {
          walk(child);
        }
      }
    }

    walk(ast);

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  } catch (error) {
    console.error('Error parsing markdown for task stats:', error);
    return { completed: 0, total: 0, percent: 0 };
  }
}

/**
 * Walks the markdown AST and toggles the checked status of the checklist item at a specific 0-based index.
 */
export function toggleCheckboxInMarkdown(markdown: string, index: number): string {
  try {
    const processor = unified().use(remarkParse).use(remarkGfm);
    const ast = processor.parse(markdown);
    
    let currentIndex = -1;
    let toggled = false;

    function walk(n: any) {
      if (toggled) return;

      if (n.type === 'listItem' && typeof n.checked === 'boolean') {
        currentIndex++;
        if (currentIndex === index) {
          n.checked = !n.checked;
          toggled = true;
          return;
        }
      }

      if (n.children) {
        for (const child of n.children) {
          walk(child);
          if (toggled) return;
        }
      }
    }

    walk(ast);

    if (toggled) {
      // Create stringifier with bullet formatting preferred, GFM enabled
      const stringifier = unified()
        .use(remarkGfm)
        .use(remarkStringify, {
          bullet: '-',
          fence: '`',
          fences: true,
          incrementListMarker: true,
        });
      return stringifier.stringify(ast);
    }
  } catch (error) {
    console.error('Error toggling checkbox in markdown:', error);
  }
  return markdown;
}
