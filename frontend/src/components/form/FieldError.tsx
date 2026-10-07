import { AnimatePresence, motion } from 'framer-motion';

/** Mensagem de erro de campo — vermelho, com entrada/saída animadas. */
export function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {message ? (
        <motion.span
          key={message}
          role="alert"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden text-xs font-medium text-[#dc2626]"
        >
          {message}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
