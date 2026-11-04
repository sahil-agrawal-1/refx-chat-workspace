import React, { useState } from 'react';
import { Download, FileText, Code, Globe, Check, Copy } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAppStore } from '@/stores/app-store';

/**
 * Escape HTML special characters to prevent XSS in rendered output.
 * @exported for testing
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate that a string is a safe http(s) URL or empty.
 * @exported for testing
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const ExportChatModal: React.FC = () => {
  const { activeModal, closeModal, currentConversation } = useAppStore();
  const [format, setFormat] = useState<'markdown' | 'json' | 'html'>('markdown');
  const [copied, setCopied] = useState(false);

  if (activeModal !== 'export' || !currentConversation) return null;

  const hasMessages = currentConversation.messages.length > 0;

  // Sanitized conversation title for use in HTML/JSON/Markdown output.
  const safeTitle = escapeHtml(currentConversation.title);
  const safeFileName = currentConversation.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'export';

  const generateExportContent = (): string => {
    if (!hasMessages) return 'No messages to export.';

    if (format === 'json') {
      const exportData = {
        title: currentConversation.title,
        createdAt: new Date(currentConversation.createdAt).toISOString(),
        model: currentConversation.model,
        messages: currentConversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp).toISOString(),
        })),
      };
      return JSON.stringify(exportData, null, 2);
    }

    if (format === 'html') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #141416; color: #ececee; max-width: 760px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    .msg { margin-bottom: 20px; padding: 14px; border-radius: 8px; }
    .user { background: #242427; }
    .assistant { background: #1a1a1d; border: 1px solid #28282d; }
    .author { font-size: 11px; color: #888891; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; }
  </style>
</head>
<body>
  <h2>${safeTitle}</h2>
  <p><small>Model: ${escapeHtml(currentConversation.model)} &bull; Date: ${new Date(currentConversation.createdAt).toLocaleString()}</small></p>
  ${currentConversation.messages
    .map(
      (m) => `
    <div class="msg ${escapeHtml(m.role)}">
      <div class="author">${escapeHtml(m.role)}</div>
      <div>${escapeHtml(m.content).replace(/\n/g, '<br>')}</div>
    </div>`
    )
    .join('')}
</body>
</html>`;
    }

    let md = `# ${safeTitle}\n\n`;
    md += `*Exported from Refx on ${new Date().toLocaleString()}*\n\n`;

    currentConversation.messages.forEach((m) => {
      md += `### ${m.role === 'user' ? 'User' : 'Assistant'}\n\n${m.content}\n\n---\n\n`;
    });

    return md;
  };

  const content = generateExportContent();

  const handleDownload = () => {
    if (!hasMessages) return;
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : format === 'html' ? 'text/html' : 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName}.${format === 'json' ? 'json' : format === 'html' ? 'html' : 'md'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!hasMessages) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={activeModal === 'export'}
      onClose={closeModal}
      title="Export Conversation"
      subtitle="Export the active chat log."
      maxWidth="max-w-lg"
    >
      <div className="space-y-3.5 text-xs">
        <div>
          <label className="block text-foreground-muted font-medium mb-1">Format</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormat('markdown')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                format === 'markdown'
                  ? 'bg-surface text-foreground border-zinc-500 font-medium'
                  : 'bg-surface text-foreground-muted border-border hover:text-foreground'
              }`}
            >
              <FileText size={14} strokeWidth={1.8} className="text-foreground-muted" />
              <span>Markdown</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                format === 'json'
                  ? 'bg-surface text-foreground border-zinc-500 font-medium'
                  : 'bg-surface text-foreground-muted border-border hover:text-foreground'
              }`}
            >
              <Code size={14} strokeWidth={1.8} className="text-foreground-muted" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('html')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                format === 'html'
                  ? 'bg-surface text-foreground border-zinc-500 font-medium'
                  : 'bg-surface text-foreground-muted border-border hover:text-foreground'
              }`}
            >
              <Globe size={14} strokeWidth={1.8} className="text-foreground-muted" />
              <span>HTML</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-foreground-muted font-medium mb-1">Preview</label>
          <pre className="p-2.5 bg-surface border border-border rounded-md text-[11px] font-mono text-foreground-muted max-h-32 overflow-y-auto custom-scrollbar select-text">
            {content.slice(0, 400) + (content.length > 400 ? '\n...' : '')}
          </pre>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-border">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasMessages}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-[#28282d] text-foreground rounded-md transition-colors cursor-pointer text-xs disabled:opacity-40"
          >
            {copied ? <Check size={14} strokeWidth={2} className="text-emerald-400" /> : <Copy size={14} strokeWidth={1.8} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!hasMessages}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-md font-medium transition-colors cursor-pointer text-xs disabled:opacity-40"
          >
            <Download size={14} strokeWidth={1.8} />
            <span>Download</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
