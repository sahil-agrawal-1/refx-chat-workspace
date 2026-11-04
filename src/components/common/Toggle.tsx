import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled = false }) => {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {label && <span className="text-xs text-foreground-muted">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border shadow-xs ${
          checked
            ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
            : 'bg-zinc-300 dark:bg-zinc-700 border-zinc-400/50 dark:border-zinc-600'
        }`}
      >
        <span
          className={`pointer-events-none block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ease-in-out shadow-sm ${
            checked
              ? 'translate-x-4 bg-white dark:bg-zinc-900'
              : 'translate-x-0 bg-white dark:bg-zinc-200'
          }`}
        />
      </button>
    </label>
  );
};
