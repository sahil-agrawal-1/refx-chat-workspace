import React, { useState } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAppStore } from '@/stores/app-store';

export const PermissionModal: React.FC = () => {
  const { activeModal, pendingPermission, resolvePermission } = useAppStore();
  const [rememberSession, setRememberSession] = useState(false);

  if (activeModal !== 'permission' || !pendingPermission) return null;

  const isTerminal = pendingPermission.type === 'terminal_exec';

  return (
    <Modal
      isOpen={activeModal === 'permission'}
      onClose={() => resolvePermission(false)}
      title="Security Permission Request"
      subtitle="Execution Confirmation"
      maxWidth="max-w-lg"
    >
      <div className="space-y-3.5 text-xs">
        <div className="flex items-start gap-2.5 p-3 bg-surface-raised border border-border rounded-lg text-foreground">
          <ShieldAlert size={18} strokeWidth={1.8} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-medium text-foreground">{pendingPermission.title}</h4>
            <p className="text-foreground-muted text-[11px] leading-relaxed">{pendingPermission.description}</p>
          </div>
        </div>

        {isTerminal && pendingPermission.details && (
          <div className="space-y-1">
            <label className="text-foreground-muted font-medium text-[11px]">Command to execute:</label>
            <div className="p-2.5 bg-surface border border-border rounded font-mono text-zinc-300 break-all select-all text-xs">
              {String(pendingPermission.details.command || '')}
            </div>
            {Boolean(pendingPermission.details.cwd) && (
              <p className="text-[11px] text-foreground-muted font-mono">
                Working directory: {String(pendingPermission.details.cwd)}
              </p>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer pt-1 select-none text-foreground-muted">
          <input
            type="checkbox"
            checked={rememberSession}
            onChange={(e) => setRememberSession(e.target.checked)}
            className="rounded border-border bg-surface text-foreground focus:ring-0"
          />
          <span className="text-[11px]">Remember for current session</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-border">
          <button
            type="button"
            onClick={() => resolvePermission(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface text-foreground rounded-md transition-colors cursor-pointer text-xs"
          >
            <X size={14} strokeWidth={1.8} />
            <span>Deny</span>
          </button>

          <button
            type="button"
            onClick={() => resolvePermission(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 font-medium rounded-md transition-colors cursor-pointer text-xs"
          >
            <Check size={14} strokeWidth={2} />
            <span>Allow</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
