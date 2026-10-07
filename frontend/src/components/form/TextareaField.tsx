import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { FieldError } from './FieldError';

interface TextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(function TextareaField({ label, error, id, className = '', ...props }, ref) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-semibold text-[#0a0a0a]">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        className={`min-h-20 rounded-lg border bg-white px-3 py-2 text-sm text-[#0a0a0a] outline-none transition-all placeholder:text-[#0a0a0a]/35 focus:ring-4 ${
          error
            ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/15'
            : 'border-[#e5e5e5] hover:border-[#a3a3a3] focus:border-[#0a0a0a] focus:ring-[#0a0a0a]/10'
        } ${className}`}
        {...props}
      />
      <FieldError message={error} />
    </div>
  );
});
