import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react';
import { motion } from 'framer-motion';

interface SwitchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

/**
 * Interruptor "Ativo" no padrão Obsidian (preto neon).
 * Mantém um checkbox nativo oculto para integrar com react-hook-form.
 */
export const SwitchField = forwardRef<HTMLInputElement, SwitchFieldProps>(
  function SwitchField(
    {
      label = 'Ativo',
      description,
      id,
      className = '',
      disabled,
      onChange,
      onBlur,
      name,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [checked, setChecked] = useState(Boolean(props.defaultChecked ?? props.checked));

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        if (node) setChecked(node.checked);
      },
      [ref],
    );

    // Cobre reset() e mudanças programáticas do RHF.
    useEffect(() => {
      const node = inputRef.current;
      if (node && node.checked !== checked) setChecked(node.checked);
    });

    const toggle = () => {
      const node = inputRef.current;
      if (!node || disabled) return;
      node.checked = !node.checked;
      node.dispatchEvent(new Event('change', { bubbles: true }));
      setChecked(node.checked);
    };

    return (
      <div
        className={`flex items-center justify-between gap-4 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 ${className}`}
      >
        <div className="min-w-0">
          <label
            htmlFor={fieldId}
            className="block text-sm font-semibold text-[#0a0a0a]"
          >
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-xs text-[#0a0a0a]/45">{description}</p>
          )}
        </div>

        <input
          ref={setRefs}
          id={fieldId}
          type="checkbox"
          name={name}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            setChecked(e.target.checked);
            onChange?.(e);
          }}
          onBlur={onBlur}
          {...props}
        />

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={undefined}
          aria-label={label}
          disabled={disabled}
          onClick={toggle}
          className={[
            'relative h-7 w-12 shrink-0 rounded-full transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0a0a0a]/15',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            checked
              ? 'neon-black'
              : 'bg-[#e5e5e5] shadow-inner hover:bg-[#d4d4d4]',
          ].join(' ')}
        >
          <motion.span
            aria-hidden="true"
            className={[
              'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm',
              checked ? '' : 'border border-[#e5e5e5]',
            ].join(' ')}
            animate={{ x: checked ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </button>
      </div>
    );
  },
);
