import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FieldError } from './FieldError';

interface CepFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  loading?: boolean;
  hint?: ReactNode;
}

/** Campo de CEP com feedback de busca (ViaCEP). */
export const CepField = forwardRef<HTMLInputElement, CepFieldProps>(
  function CepField(
    {
      label = 'CEP',
      error,
      loading = false,
      hint,
      id,
      className = '',
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-sm font-semibold text-[#0a0a0a]">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            aria-invalid={error ? 'true' : undefined}
            className={`w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm text-[#0a0a0a] outline-none transition-all placeholder:text-[#0a0a0a]/35 focus:ring-4 ${
              error
                ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/15'
                : 'border-[#e5e5e5] hover:border-[#a3a3a3] focus:border-[#0a0a0a] focus:ring-[#0a0a0a]/10'
            } ${className}`}
            {...props}
          />
          {loading && (
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#0a0a0a] border-t-transparent"
            />
          )}
        </div>
        <FieldError message={error} />
        <AnimatePresence initial={false}>
          {!error && hint ? (
            <motion.span
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-[#0a0a0a]/45"
            >
              {hint}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    );
  },
);
