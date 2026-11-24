import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Formats display math blocks ($$...$$) from the authoritative B.Com Markdown files
 * into crisp, readable HTML formula cards without altering any accounting meaning.
 */
function preprocessFormulas(md: string): string {
  return md.replace(/\$\$([\s\S]+?)\$\$/g, (_match, rawExpr: string) => {
    const cleaned = rawExpr
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\times/g, '×')
      .trim();

    return `\n<div class="my-4 rounded-lg border border-navy-100 bg-navy-50 px-5 py-3.5 text-center font-semibold text-navy-900 tracking-wide text-sm md:text-base tabular-nums">${cleaned}</div>\n`;
  });
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return '';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const prepared = preprocessFormulas(content);

  return (
    <div className="academic-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          table: ({ children }) => {
            const text = extractText(children);
            const isJournalTable =
              text.includes('Particulars') &&
              text.includes('Debit') &&
              text.includes('Credit');

            return (
              <div className="my-5 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
                {isJournalTable && (
                  <div className="border-b border-navy-800 bg-navy-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-100">
                    Journal Entry Format
                  </div>
                )}
                <table
                  className={`w-full border-collapse text-left text-sm ${
                    isJournalTable ? 'min-w-[600px]' : 'min-w-[460px]'
                  }`}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead: ({ children }) => (
            <thead className="bg-navy-900 text-white">{children}</thead>
          ),
          th: ({ children, style }) => {
            const alignRight = style?.textAlign === 'right';
            const alignCenter = style?.textAlign === 'center';
            return (
              <th
                className={`border-b border-navy-800 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white ${
                  alignRight ? 'text-right' : alignCenter ? 'text-center' : 'text-left'
                }`}
              >
                {children}
              </th>
            );
          },
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="odd:bg-white even:bg-slate-50/70">{children}</tr>
          ),
          td: ({ children, style }) => {
            const alignRight = style?.textAlign === 'right';
            const alignCenter = style?.textAlign === 'center';
            return (
              <td
                className={`border-r border-slate-100 px-3.5 py-3 align-top text-slate-700 last:border-r-0 ${
                  alignRight
                    ? 'text-right font-medium tabular-nums text-navy-900 whitespace-nowrap'
                    : alignCenter
                      ? 'text-center'
                      : 'text-left'
                }`}
              >
                {children}
              </td>
            );
          },
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
};
