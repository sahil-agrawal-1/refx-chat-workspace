import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  headerAction?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-3xl',
  headerAction,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidth} bg-[#141417] border border-[#27272a] rounded-2xl sm:rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.7)] flex flex-col max-h-[90vh] overflow-hidden text-foreground ring-1 ring-white/10`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242427] bg-[#18181b]/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-300">
                {icon}
              </div>
            )}
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight truncate">{title}</h2>
              {subtitle && <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 bg-[#141417]">
          {children}
        </div>
      </div>
    </div>
  );
};
