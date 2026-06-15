// Utilitários de data compartilhados pelos formulários e telas de detalhe.
// Datas são digitadas como DD/MM/AAAA e persistidas como ISO (AAAA-MM-DD).

export function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isValidDate(d: string): boolean {
  if (d.length < 10) return false;
  const [day, month, year] = d.split('/').map(Number);
  if (!day || !month || !year || year < 1900 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1;
}

/** Data BR (DD/MM/AAAA) é posterior ao dia de hoje? */
export function isFuture(d: string): boolean {
  const [day, month, year] = d.split('/').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(year, month - 1, day).getTime() > today.getTime();
}

export function toISO(d: string): string {
  const [day, month, year] = d.split('/');
  return `${year}-${month}-${day}`;
}

export function displayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Dias entre hoje e uma data ISO (negativo = já passou). */
export function daysUntilISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
}

/** "hoje", "amanhã", "em 5 dias", "há 3 dias". */
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days === -1) return 'há 1 dia';
  if (days > 1) return `em ${days} dias`;
  return `há ${-days} dias`;
}

/** "X anos e Y meses" / "X meses" / "X dias" entre uma data ISO e hoje. */
export function formatDuration(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const now = new Date();
  if (start > now) return '';
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < start.getDate())) {
    years--;
    months += 12;
  }
  if (years > 0) {
    return months > 0
      ? `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`
      : `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
  if (months > 0) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const days = Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000));
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export function calcAge(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  const now = new Date();
  if (birth > now) return '';
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  if (years === 0) {
    const anchor = new Date(birth);
    anchor.setMonth(anchor.getMonth() + months);
    const days = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / 86400000));
    if (months === 0) {
      if (days === 0) return 'recém-nascido';
      return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    if (days === 0) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    return `${months} ${months === 1 ? 'mês' : 'meses'} e ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  if (months === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
}
