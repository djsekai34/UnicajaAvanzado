// Sello discreto de aniversario del club — solo se muestra cuando la
// temporada activa/seleccionada es la del aniversario (26/27).
export default function AniversarioBadge({ temporadaNombre }) {
  const esAniversario = temporadaNombre && /26[\s/.-]?27/.test(temporadaNombre)
  if (!esAniversario) return null

  return (
    <div className="aniversario-badge" title="50º Aniversario del club">
      <svg viewBox="0 0 100 100" width="64" height="64">
        <circle cx="50" cy="50" r="47" fill="none" stroke="var(--lima)" strokeWidth="2" strokeDasharray="3.5 3.5" opacity="0.8" />
        <circle cx="50" cy="50" r="38" fill="var(--negro)" stroke="var(--verde)" strokeWidth="2.5" />
        <text x="50" y="49" textAnchor="middle" fontFamily="var(--font-display)" fontSize="30" fontWeight="700" fill="var(--lima)">50</text>
        <text x="50" y="66" textAnchor="middle" fontFamily="var(--font-body)" fontSize="8" fontWeight="700" letterSpacing="1.2" fill="var(--gris-100)">AÑOS</text>
      </svg>
    </div>
  )
}
