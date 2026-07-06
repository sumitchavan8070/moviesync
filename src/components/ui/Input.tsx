import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-3 rounded-2xl glass bg-white/5 text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${error ? 'ring-2 ring-danger/50' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
