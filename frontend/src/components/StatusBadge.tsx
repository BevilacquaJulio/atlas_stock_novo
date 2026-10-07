export function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`badge ${ativo ? 'badge--solid' : 'badge--muted'}`}>
      <span className="badge__dot" aria-hidden="true" />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}
