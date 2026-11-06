import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  FileCode,
  FileEdit,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Split,
  Info,
  RotateCcw,
  Clock,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Wand2,
  Globe,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  CornerUpLeft,
  FileText,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { ChatMessage, ActivityStep } from '@/types';
import { sanitizeExternalUrl } from '@shared/security/url-policy';

const HtmlIcon = ({ size = 11, color = '#E34F26' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="20" height="20" x="2" y="2" rx="3" stroke={color} strokeWidth="2" />
    <path d="M12 2l5 7M7 9l5 7M17 9l-5 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CssIcon = ({ size = 11, color = '#1572B6' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ScssIcon = ({ size = 11, color = '#CC6699' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const VueIcon = ({ size = 11, color = '#4FC08D' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 7h10M7 17h10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PhpIcon = ({ size = 11, color = '#777BB4' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="20" height="20" x="2" y="2" rx="3" stroke={color} strokeWidth="2" />
    <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const JavaIcon = ({ size = 11, color = '#007396' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const GoIcon = ({ size = 11, color = '#00ADD8' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <path d="M7 12l2.5 2.5M12 7l2.5 2.5M17 12l-2.5 2.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const RustIcon = ({ size = 11, color = '#DEA584' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M12 7v10M7 12h10" stroke="#2B2B2B" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CppIcon = ({ size = 11, color = '#00599C' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="20" height="20" x="2" y="2" rx="2" stroke={color} strokeWidth="2" />
    <path d="M8 8h8M8 12h8M8 16h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CsIcon = ({ size = 11, color = '#68217A' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SwiftIcon = ({ size = 11, color = '#F05138' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 7h10M7 17h10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const KotlinIcon = ({ size = 11, color = '#7F52FF' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 7h10M7 17h10M12 7v10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const RubyIcon = ({ size = 11, color = '#CC342D' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <path d="M7 7h10M7 17h10M12 7v10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ShIcon = ({ size = 11, color = '#4EAA25' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const DockerIcon = ({ size = 11, color = '#0DB9ED' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const JsonIcon = ({ size = 11, color = '#F7DF1E' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M12 7v10M7 12h10" stroke="#333" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const YamlIcon = ({ size = 11, color = '#CB171E' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const MdIcon = ({ size = 11, color = '#000000' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="20" height="20" x="2" y="2" rx="2" stroke={color} strokeWidth="2" />
    <path d="M7 8h10M7 12h10M7 16h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ImageIcon = ({ size = 11, color = '#4A90E2' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="18" height="14" x="3" y="3" rx="2" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.6" />
    <path d="M3 17l4-4 4 4 8-8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const VideoIcon = ({ size = 11, color = '#E91E63' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="20" height="14" x="2" y="5" rx="2" stroke={color} strokeWidth="2" />
    <path d="M8 8l4 2.5-4 2.5z" fill={color} />
  </svg>
);

const AudioIcon = ({ size = 11, color = '#9C27B0' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 3v6M12 15v6M3.5 12a8.5 8.5 0 0117 0z" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ArchiveIcon = ({ size = 11, color = '#795548' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="16" height="16" x="4" y="4" rx="1" stroke={color} strokeWidth="2" />
    <path d="M12 8v4M8 12l4-4 4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PdfIcon = ({ size = 11, color = '#D32323' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="20" height="24" x="2" y="0" rx="2" stroke={color} strokeWidth="2" />
    <path d="M7 8h10M7 12h10M7 16h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const FontIcon = ({ size = 11, color = '#9E9E9E' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill={color} />
    <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const GitIcon = ({ size = 11, color = '#F05032' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const DefaultIcon = ({ size = 11, color = '#6366f1' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect width="18" height="18" x="3" y="3" rx="2" stroke={color} strokeWidth="2" />
    <path d="M9 12h6M12 9l3 3-3 3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const PyIcon = ({ size = 11, color = '#3776AB' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" fill={color} />
    <path d="M8 8h8M8 12h8M8 16h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Inline brand icons for common file extensions (keeps bundle lean, no extra deps)
const ReactIcon = ({ size = 11, color = '#61DAFB' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className="shrink-0"
  >
    <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <path
      d="M12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"
      fill={color}
    />
    <ellipse cx="12" cy="12" rx="4" ry="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const JsIcon = ({ size = 11, color = '#F7DF1E' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M12 2L2 12l10 10 10-10L12 2z"
      fill={color}
    />
    <path d="M12 6.5v11M7.5 12h9" stroke="#333" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const TsIcon = ({ size = 11, color = '#3178C6' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M12 2L2 12l10 10 10-10L12 2z"
      fill={color}
    />
    <path d="M12 6.5v11M7.5 12h9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Helper: select icon & color based on file extension
const getFileIcon = (fileName: string): React.ReactElement => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  switch (ext) {
    // React / frontend frameworks
    case 'jsx':
    case 'tsx':
      return <ReactIcon size={11} color="#61DAFB" />;
    // JavaScript
    case 'js':
    case 'mjs':
    case 'cjs':
      return <JsIcon size={11} color="#F7DF1E" />;
    // TypeScript
    case 'ts':
      return <TsIcon size={11} color="#3178C6" />;
    // Web
    case 'html':
    case 'htm':
      return <HtmlIcon size={11} color="#E34F26" />;
    case 'css':
      return <CssIcon size={11} color="#1572B6" />;
    case 'scss':
    case 'sass':
      return <ScssIcon size={11} color="#CC6699" />;
    case 'less':
      return <CssIcon size={11} color="#1D365D" />;
    case 'vue':
      return <VueIcon size={11} color="#4FC08D" />;
    // Python
    case 'py':
    case 'pyw':
      return <PyIcon size={11} color="#3776AB" />;
    // Backend / languages
    case 'php':
      return <PhpIcon size={11} color="#777BB4" />;
    case 'java':
      return <JavaIcon size={11} color="#007396" />;
    case 'go':
      return <GoIcon size={11} color="#00ADD8" />;
    case 'rs':
      return <RustIcon size={11} color="#DEA584" />;
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
    case 'c':
      return <CppIcon size={11} color="#00599C" />;
    case 'cs':
      return <CsIcon size={11} color="#68217A" />;
    case 'swift':
      return <SwiftIcon size={11} color="#F05138" />;
    case 'kt':
    case 'kts':
      return <KotlinIcon size={11} color="#7F52FF" />;
    case 'rb':
      return <RubyIcon size={11} color="#CC342D" />;
    // Shell / scripts
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return <ShIcon size={11} color="#4EAA25" />;
    case 'ps1':
    case 'psm1':
    case 'psd1':
      return <ShIcon size={11} color="#5391FE" />;
    // Data / config
    case 'json':
      return <JsonIcon size={11} color="#F7DF1E" />;
    case 'yaml':
    case 'yml':
      return <YamlIcon size={11} color="#CB171E" />;
    case 'toml':
      return <YamlIcon size={11} color="#9C27B0" />;
    case 'xml':
      return <HtmlIcon size={11} color="#E34F26" />;
    case 'ini':
    case 'cfg':
    case 'conf':
      return <YamlIcon size={11} color="#616161" />;
    case 'env':
    case 'env.local':
    case 'env.development':
    case 'env.production':
      return <GitIcon size={11} color="#F05032" />;
    case 'lock':
      return <DefaultIcon size={11} color="#9E9E9E" />;
    // Markdown / docs
    case 'md':
    case 'mdx':
      return <MdIcon size={11} color="#000000" />;
    case 'txt':
      return <FileCode size={11} className="text-gray-400 shrink-0" />;
    case 'pdf':
      return <PdfIcon size={11} color="#D32323" />;
    case 'doc':
    case 'docx':
      return <FileEdit size={11} className="text-blue-400 shrink-0" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileCode size={11} className="text-emerald-400 shrink-0" />;
    case 'ppt':
    case 'pptx':
      return <FileEdit size={11} className="text-orange-400 shrink-0" />;
    // Images
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
    case 'ico':
    case 'bmp':
      return <ImageIcon size={11} color="#4A90E2" />;
    // Video
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
    case 'mkv':
      return <VideoIcon size={11} color="#E91E63" />;
    // Audio
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
      return <AudioIcon size={11} color="#9C27B0" />;
    // Archives
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
      return <ArchiveIcon size={11} color="#795548" />;
    // Fonts
    case 'ttf':
    case 'otf':
    case 'woff':
    case 'woff2':
      return <FontIcon size={11} color="#9E9E9E" />;
    // Database
    case 'sql':
    case 'db':
    case 'sqlite':
    case 'sqlite3':
      return <ArchiveIcon size={11} color="#336791" />;
    // Docker
    case 'dockerfile':
    case 'dockerignore':
      return <DockerIcon size={11} color="#0DB9ED" />;
    // Git
    case 'gitignore':
    case 'gitattributes':
    case 'gitmodules':
    case 'gitkeep':
      return <GitIcon size={11} color="#F05032" />;
    // Make / build
    case 'makefile':
    case 'mk':
      return <ArchiveIcon size={11} color="#616161" />;
    case 'cmake':
      return <CppIcon size={11} color="#00599C" />;
    // Default fallback
    default:
      return <DefaultIcon size={11} color="#6366f1" />;
  }
};

const renderInline = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded-md bg-surface border border-border text-indigo-400 text-[11px] font-mono">
          {match[1]}
        </code>
      );
    } else if (match[2] !== undefined) {
      parts.push(<strong key={match.index} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={match.index} className="italic text-foreground">{match[3]}</em>);
    } else if (match[4] !== undefined) {
      // Model output is untrusted. Only render an anchor for absolute http(s)
      // URLs; anything else (javascript:, data:, file:, relative paths) stays
      // plain text so it cannot execute or navigate outside the app.
      const href = sanitizeExternalUrl(match[5]);
      if (href) {
        parts.push(
          <a
            key={match.index}
            href={href}
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {match[4]}
          </a>
        );
      } else {
        parts.push(match[4]);
      }
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length ? parts : [text];
};

const ToolActionCard: React.FC<{ name: string; path?: string }> = ({ name, path }) => {
  return (
    <div className="my-2.5 px-3.5 py-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 backdrop-blur-xs flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2.5 text-xs text-foreground min-w-0">
        <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0">
          <FileEdit size={14} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-foreground">
            {name === 'edit_file' ? 'File Modification Proposed' : name === 'create_file' ? 'New File Proposed' : `Tool Action: ${name}`}
          </div>
          {path && (
            <div className="font-mono text-[11px] text-foreground-muted mt-0.5 truncate max-w-sm sm:max-w-md">
              {path}
            </div>
          )}
        </div>
      </div>
      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-medium border border-indigo-500/20 uppercase tracking-wider shrink-0 ml-2">
        Action
      </span>
    </div>
  );
};

const CodeBlock: React.FC<{ lang: string; code: string }> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = (lang || 'code').toUpperCase();

  return (
    <div className="my-4 rounded-xl border border-[#303033] overflow-hidden bg-surface shadow-[0_12px_32px_rgba(0,0,0,.2)] transition-all group">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-surface-raised border-b border-[#303033] text-xs select-none">
        <div className="flex items-center gap-3">
          {/* Language Pill */}
          <div className="flex items-center gap-1.5 text-foreground-muted">
            <Code2 size={13} className="text-indigo-400 shrink-0" />
            <span className="font-mono text-[10.5px] font-semibold text-foreground/85 tracking-wider">
              {displayLang}
            </span>
          </div>

          {/* Line Counter */}
          <span className="text-[10px] text-foreground-muted/60 font-mono hidden sm:inline">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Copy Button with Feedback */}
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
              : 'bg-surface hover:bg-surface-raised text-foreground-muted hover:text-foreground border border-border/60 hover:border-border'
          }`}
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} strokeWidth={2.5} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} strokeWidth={1.8} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto p-4 text-[12px] font-mono leading-6 select-text scrollbar-thin">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02] group/line transition-colors">
                <td className="w-9 pr-3 text-right text-foreground-muted/40 group-hover/line:text-foreground-muted/70 select-none text-[11px] align-top">
                  {idx + 1}
                </td>
                <td className="pl-3 border-l border-border/30 whitespace-pre text-[#e6edf3] font-mono">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  // 1. Extract any <tool_call> blocks if present
  const toolCallRegex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/gi;
  const sections: Array<{ type: 'markdown' | 'tool_card'; content: string; toolName?: string; toolPath?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = toolCallRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      sections.push({ type: 'markdown', content: content.slice(lastIndex, match.index) });
    }
    const raw = match[1];
    const funcMatch = raw.match(/<function[ =]([a-zA-Z0-9_\-:]+)>|<function\s+name=["']?([a-zA-Z0-9_\-:]+)["']?>/i);
    const funcName = funcMatch ? (funcMatch[1] || funcMatch[2]) : 'edit_file';
    const pathMatch = raw.match(/<parameter=path>([\s\S]*?)(?:<\/parameter>|(?=<parameter=)|$)/i);
    const path = pathMatch ? pathMatch[1].trim() : '';

    sections.push({
      type: 'tool_card',
      content: raw,
      toolName: funcName,
      toolPath: path,
    });
    lastIndex = toolCallRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    sections.push({ type: 'markdown', content: content.slice(lastIndex) });
  }

  return (
    <>
      {sections.map((sec, secIdx) => {
        if (sec.type === 'tool_card') {
          return <ToolActionCard key={`tool-${secIdx}`} name={sec.toolName || 'tool'} path={sec.toolPath} />;
        }

        // Support both completed code blocks and streaming open code blocks: ```lang\n...
        const parts = sec.content.split(/(```[\w-]*\n[\s\S]*?(?:```|$))/g);

        return (
          <React.Fragment key={`sec-${secIdx}`}>
            {parts.map((part, i) => {
              if (part.startsWith('```')) {
                const m = part.match(/^```([\w-]*)\n?([\s\S]*?)(?:```)?$/);
                return <CodeBlock key={i} lang={m?.[1] || ''} code={m?.[2] || ''} />;
              }
              const lines = part.split('\n');
              const elements: React.ReactNode[] = [];
              let listItems: string[] = [];
              const flushList = () => {
                if (listItems.length) {
                  elements.push(
                    <ul key={`ul-${elements.length}`} className="list-none space-y-1.5 my-2 pl-3">
                      {listItems.map((li, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-foreground text-xs">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <span className="leading-relaxed">{renderInline(li)}</span>
                        </li>
                      ))}
                    </ul>
                  );
                  listItems = [];
                }
              };
              lines.forEach((line, idx) => {
                if (line.startsWith('### ')) {
                  flushList();
                  elements.push(<h3 key={`h3-${idx}`} className="text-sm font-semibold text-foreground mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
                } else if (line.startsWith('## ')) {
                  flushList();
                  elements.push(<h2 key={`h2-${idx}`} className="text-base font-semibold text-foreground mt-4 mb-1.5 border-b border-border pb-1">{renderInline(line.slice(3))}</h2>);
                } else if (line.startsWith('# ')) {
                  flushList();
                  elements.push(<h1 key={`h1-${idx}`} className="text-lg font-bold text-foreground mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
                } else if (/^[-*] /.test(line)) {
                  listItems.push(line.slice(2));
                } else if (line.trim() === '') {
                  flushList();
                } else {
                  flushList();
                  elements.push(<p key={`p-${idx}`} className="my-1.5 leading-relaxed text-foreground text-xs">{renderInline(line)}</p>);
                }
              });
              flushList();
              return <div key={i}>{elements}</div>;
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

interface GroupedActivity {
  id: string;
  type: string;
  title: string;
  detail?: string;
  status: 'running' | 'completed' | 'failed';
  count: number;
}

const ThinkingProcessCard: React.FC<{
  activities: ActivityStep[];
  durationMs?: number;
  timestamp: number;
  isGenerating: boolean;
}> = ({ activities, durationMs, timestamp, isGenerating }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'timeline'>('grouped');
  const [elapsed, setElapsed] = useState<number>(() => {
    if (durationMs) return Math.max(1, Math.round(durationMs / 1000));
    return Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  });

  useEffect(() => {
    if (durationMs || !isGenerating) return;
    const timer = setInterval(() => {
      setElapsed(Math.max(1, Math.round((Date.now() - timestamp) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [isGenerating, durationMs, timestamp]);

  const durationStr = durationMs
    ? `${(durationMs / 1000).toFixed(1)}s`
    : `${elapsed}s`;

  // Categorize activities into clean groups
  const fileReads: { name: string; fullPath: string; count: number }[] = [];
  const fileWrites: { name: string; fullPath: string; type: string }[] = [];
  const webSearches: string[] = [];
  const webBrowses: string[] = [];

  for (const act of activities) {
    const detailClean = (act.detail || '').replace(/\\/g, '/');
    const fileName = detailClean.split('/').pop() || detailClean || act.title;

    if (act.type === 'file_read') {
      const existing = fileReads.find((f) => f.name === fileName);
      if (existing) {
        existing.count += 1;
      } else {
        fileReads.push({ name: fileName, fullPath: detailClean, count: 1 });
      }
    } else if (act.type === 'file_write') {
      fileWrites.push({ name: fileName, fullPath: detailClean, type: act.title });
    } else if (act.type === 'web_search') {
      if (!webSearches.includes(act.detail || act.title)) {
        webSearches.push(act.detail || act.title);
      }
    } else if (act.type === 'web_browse') {
      if (!webBrowses.includes(act.detail || act.title)) {
        webBrowses.push(act.detail || act.title);
      }
    }
  }

  // Active step info while generating
  const currentActive = isGenerating ? activities[activities.length - 1] : null;
  const currentActionDetail = currentActive
    ? (currentActive.detail ? currentActive.detail.replace(/\\/g, '/').split('/').pop() : currentActive.title)
    : null;

  const totalSteps = activities.length;

  return (
    <div className="my-2 select-none">
      {/* Sleek Thinking Header matching Figma: "Thinking ^" */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground cursor-pointer transition-colors"
      >
        <span>Thinking</span>
        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {isOpen && (
        <div className="mt-2 pl-1 space-y-1.5 text-xs animate-smooth-in">
          {activities.map((step, idx) => {
            const detailClean = (step.detail || '').replace(/\\/g, '/');
            const fileName = detailClean.split('/').pop() || detailClean || step.title;
            const isReact = fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || step.title.toLowerCase().includes('tsx');
            const isPackage = step.type === 'terminal_run' || step.title.toLowerCase().includes('install') || step.title.toLowerCase().includes('package');

            return (
              <div key={step.id || idx} className="flex items-center gap-2 text-foreground-muted py-0.5">
                {isReact ? (
                  <span className="text-cyan-400 text-sm font-bold leading-none select-none">⚛</span>
                ) : isPackage ? (
                  <Terminal size={12} className="text-foreground-muted shrink-0" />
                ) : (
                  <span className="p-0.5 rounded bg-surface-raised text-foreground-muted shrink-0">
                    {getFileIcon(fileName)}
                  </span>
                )}
                <span className="text-foreground-muted font-mono text-[11.5px] truncate">{step.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ChatMessageList: React.FC = () => {
  const { currentConversation, isGenerating, setActiveDiffFile, toggleBottomPanel, sendMessage, addTaskMemory, addAppMemory, undoMessage } = useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const messages = currentConversation?.messages || [];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetry = (msg: ChatMessage) => {
    const idx = messages.findIndex((m) => m.id === msg.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        sendMessage(messages[i].content);
        return;
      }
    }
  };

  const handleSaveMemory = (msg: ChatMessage) => {
    addTaskMemory(msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : ''), msg.content, ['chat']);
  };

  // Empty state matching "Hello, what's on your mind?"
  if (messages.length === 0) {
    const SUGGESTIONS = [
      { icon: <Code2 size={14} className="text-blue-400" />, text: 'Explain this project structure and architecture' },
      { icon: <Wand2 size={14} className="text-purple-400" />, text: 'Refactor code and improve modularity' },
      { icon: <Cpu size={14} className="text-emerald-400" />, text: 'Run terminal tests and inspect build errors' },
      { icon: <Layers size={14} className="text-amber-400" />, text: 'Draft a clean UI specification with design tokens' },
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none relative">
        <div className="max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-normal tracking-[-0.045em] text-foreground-muted">
              Start a new <span className="font-medium text-foreground">conversation.</span>
            </h1>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Build, inspect, and improve your project from one focused workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(s.text)}
                className="group p-3 rounded-2xl bg-surface-raised hover:bg-surface border border-border transition-all text-xs cursor-pointer flex items-center justify-between text-foreground shadow-xs"
              >
                <div className="flex items-center gap-2.5 truncate pr-1">
                  <span className="p-1 rounded-lg bg-surface border border-border group-hover:bg-surface-raised transition-colors">
                    {s.icon}
                  </span>
                  <span className="truncate text-xs font-medium">{s.text}</span>
                </div>
                <ArrowRight size={13} className="text-foreground-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-3 pb-8 space-y-6 max-w-3xl mx-auto w-full pr-44 xl:pr-6 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {messages.map((msg: ChatMessage) => {
        if (msg.role === 'system') {
          return (
            <div
              key={msg.id}
              className="p-3 bg-surface-raised border border-border rounded-2xl text-xs flex items-start gap-2.5 text-foreground-muted"
            >
              <Info size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          );
        }

        const isUser = msg.role === 'user';

        if (isUser) {
          return (
            <div key={msg.id} className="flex flex-col items-end space-y-1.5">
              <div className="max-w-xl bg-surface-card text-foreground rounded-2xl px-5 py-3 text-[14px] leading-relaxed border border-border/80 shadow-xs">
                <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-border">
                    {msg.attachments.map((att) => (
                      <span
                        key={att.id}
                        className="text-[10px] font-mono bg-surface border border-border px-2 py-0.5 rounded-md text-foreground-muted flex items-center gap-1"
                      >
                        <FileCode size={12} strokeWidth={1.8} className="text-foreground-muted" />
                        {att.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Micro Toolbar below user message: CornerUpLeft, RotateCcw, Copy */}
              <div className="flex items-center gap-2.5 text-foreground-muted pr-1">
                <button
                  type="button"
                  onClick={() => { void undoMessage(msg.id); }}
                  title="Undo / Reply"
                  className="hover:text-foreground transition-colors cursor-pointer"
                >
                  <CornerUpLeft size={13} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRetry(msg)}
                  title="Retry"
                  className="hover:text-foreground-muted transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(msg.content, msg.id)}
                  title="Copy"
                  className="hover:text-foreground-muted transition-colors cursor-pointer"
                >
                  {copiedId === msg.id ? (
                    <Check size={13} strokeWidth={2} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>
          );
        }

        // Assistant Message
        return (
          <div key={msg.id} className="flex flex-col space-y-2 text-foreground">
            {/* Main Conversational Response Text directly on canvas */}
            <div className="text-[14.5px] text-foreground leading-relaxed">
              <MarkdownContent content={msg.content || (isGenerating ? '' : 'No response generated.')} />
              {isGenerating && msg.id === messages[messages.length - 1]?.id && (
                <span className="inline-block w-1.5 h-3.5 bg-zinc-200 ml-1 align-middle animate-pulse" />
              )}
            </div>

            {/* Status: Worked for 2m > */}
            <div className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground-muted cursor-pointer w-fit">
              <span>Worked for {msg.durationMs ? `${(msg.durationMs / 1000).toFixed(0)}s` : '2m'}</span>
              <ChevronRight size={12} strokeWidth={1.8} />
            </div>

            {/* Thinking Accordion */}
            {msg.activities && msg.activities.length > 0 && (
              <ThinkingProcessCard
                activities={msg.activities}
                durationMs={msg.durationMs}
                timestamp={msg.timestamp}
                isGenerating={isGenerating && msg.id === messages[messages.length - 1]?.id}
              />
            )}

            {/* File Changed Card */}
            {((msg.fileChanges && msg.fileChanges.length > 0) || (msg.activities && msg.activities.some((a) => a.type === 'file_write'))) && (
              <div className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between shadow-xs mt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-foreground font-medium">
                    {msg.fileChanges?.length || 1} file changed
                  </span>
                  <span className="text-emerald-400 font-mono font-medium">
                    +{msg.fileChanges?.reduce((acc, c) => acc + c.additions, 0) || 15}
                  </span>
                  <span className="text-rose-400 font-mono font-medium">
                    -{msg.fileChanges?.reduce((acc, c) => acc + c.deletions, 0) || 34}
                  </span>
                  <ChevronRight size={12} className="text-foreground-muted" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (msg.fileChanges && msg.fileChanges[0]) {
                      setActiveDiffFile(msg.fileChanges[0]);
                    }
                    toggleBottomPanel('diff');
                  }}
                  className="border border-zinc-700/80 bg-surface-raised hover:bg-surface-raised text-foreground rounded-lg px-3 py-1 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText size={13} className="text-foreground-muted" />
                  <span>Review</span>
                </button>
              </div>
            )}

            {/* Timestamp + Copy + Thumbs Up + Thumbs Down Row */}
            <div className="flex items-center gap-3 text-xs text-foreground-muted px-1 pt-0.5">
              <span>8h ago</span>
              <button
                type="button"
                onClick={() => handleCopy(msg.content, msg.id)}
                className="hover:text-foreground-muted transition-colors cursor-pointer"
                title="Copy response"
              >
                {copiedId === msg.id ? (
                  <Check size={13} strokeWidth={2} className="text-emerald-400" />
                ) : (
                  <Copy size={13} strokeWidth={1.8} />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedback((prev) => ({ ...prev, [msg.id]: 'up' }));
                  void addAppMemory(
                    'preference',
                    'Helpful assistant response',
                    'User marked an assistant response as helpful.',
                    msg.content.slice(0, 1000),
                    0.9
                  ).catch(() => {});
                }}
                className={`transition-colors cursor-pointer ${feedback[msg.id] === 'up' ? 'text-emerald-400' : 'hover:text-foreground-muted'}`}
                title="Helpful"
              >
                <ThumbsUp size={13} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedback((prev) => ({ ...prev, [msg.id]: 'down' }));
                  void addAppMemory(
                    'preference',
                    'Unhelpful assistant response',
                    'User marked an assistant response as not helpful.',
                    msg.content.slice(0, 1000),
                    0.9
                  ).catch(() => {});
                }}
                className={`transition-colors cursor-pointer ${feedback[msg.id] === 'down' ? 'text-rose-400' : 'hover:text-foreground-muted'}`}
                title="Not helpful"
              >
                <ThumbsDown size={13} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        );
      })}

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-foreground-muted py-1.5 px-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>Generating response...</span>
        </div>
      )}
    </div>
  );
};
