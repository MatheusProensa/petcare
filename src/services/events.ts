import { MedicalRecord, Pet, RecordType } from '../types';
import { daysUntilISO } from '../utils/date';

export type VaccineStatus = 'ok' | 'due_soon' | 'overdue' | 'completed';

/** Janela padrão de alerta quando o usuário não configurou lembrete. */
const DEFAULT_REMINDER_DAYS = 3;
/** Vacina fica "amarela" quando o reforço está a este número de dias ou menos. */
const VACCINE_DUE_SOON_DAYS = 15;

/**
 * Compara títulos ignorando maiúsculas e marcações de dose ("V10 2ª dose"
 * casa com "V10"), para reconhecer doses da mesma vacina/vermífugo.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b\d+\s*[ªºa°]?\s*dose\b/g, '')
    .replace(/\bdose\s*\d*\b/g, '')
    .replace(/\brefor[çc]o\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * O próximo evento deste registro já foi cumprido?
 * - Vacina/vermífugo: uma dose posterior com o mesmo nome quita o reforço.
 * - Consulta: qualquer consulta posterior à data do registro quita o retorno.
 */
export function isEventFulfilled(
  record: MedicalRecord,
  all: MedicalRecord[],
  fulfilledIds?: Set<string>,
): boolean {
  if (!record.nextDate) return false;
  if (fulfilledIds) return fulfilledIds.has(record.id);
  if (record.type === 'vaccine' || record.type === 'deworming') {
    return all.some(
      other =>
        other.id !== record.id &&
        other.petId === record.petId &&
        other.type === record.type &&
        normalizeTitle(other.title) === normalizeTitle(record.title) &&
        other.date > record.date,
    );
  }
  if (record.type === 'consultation') {
    return all.some(
      other =>
        other.id !== record.id &&
        other.petId === record.petId &&
        other.type === 'consultation' &&
        other.date > record.date,
    );
  }
  return false;
}

/**
 * Pré-computa quais registros já têm seu próximo evento (reforço/retorno/dose)
 * cumprido por um registro posterior, evitando uma busca O(n) por registro
 * em listas longas (anos de histórico).
 */
export function getFulfilledRecordIds(records: MedicalRecord[]): Set<string> {
  const fulfilled = new Set<string>();
  const groups = new Map<string, MedicalRecord[]>();
  for (const record of records) {
    let key: string | null = null;
    if (record.type === 'vaccine' || record.type === 'deworming') {
      key = `${record.petId}|${record.type}|${normalizeTitle(record.title)}`;
    } else if (record.type === 'consultation') {
      key = `${record.petId}|consultation`;
    }
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(record);
    else groups.set(key, [record]);
  }
  for (const group of groups.values()) {
    for (const record of group) {
      if (!record.nextDate) continue;
      if (group.some(other => other.id !== record.id && other.date > record.date)) {
        fulfilled.add(record.id);
      }
    }
  }
  return fulfilled;
}

export function getVaccineStatus(
  record: MedicalRecord,
  all: MedicalRecord[],
  fulfilledIds?: Set<string>,
): VaccineStatus | null {
  if (record.type !== 'vaccine') return null;
  if (!record.nextDate) return 'ok';
  if (isEventFulfilled(record, all, fulfilledIds)) return 'completed';
  const days = daysUntilISO(record.nextDate);
  if (days < 0) return 'overdue';
  if (days <= VACCINE_DUE_SOON_DAYS) return 'due_soon';
  return 'ok';
}

/** Data do próximo evento gerado por um registro (reforço, retorno, dose, fim). */
export function eventDateOf(record: MedicalRecord): string | undefined {
  if (record.type === 'medication') return record.endDate;
  if (record.type === 'note') return undefined;
  return record.nextDate;
}

const EVENT_LABELS: Partial<Record<RecordType, string>> = {
  vaccine: 'Reforço',
  consultation: 'Retorno',
  medication: 'Fim do tratamento',
  deworming: 'Próxima dose',
};

export interface UpcomingEvent {
  key: string;
  petId: string;
  petName: string;
  petPhoto?: string;
  recordId: string;
  type: RecordType;
  title: string;
  date: string;
  daysUntil: number;
  overdue: boolean;
  /** Dentro da janela de lembrete configurada (ou atrasado). */
  pending: boolean;
}

export function getUpcomingEvents(pets: Pet[], records: MedicalRecord[]): UpcomingEvent[] {
  const petById = new Map(pets.map(p => [p.id, p]));
  const fulfilledIds = getFulfilledRecordIds(records);
  const events: UpcomingEvent[] = [];
  for (const record of records) {
    const date = eventDateOf(record);
    if (!date) continue;
    const pet = petById.get(record.petId);
    if (!pet) continue;
    // Reforço/dose/retorno já cumprido em um registro mais novo: não gera alerta.
    if (isEventFulfilled(record, records, fulfilledIds)) continue;
    // Tratamento que chegou ao fim não está "atrasado" — está concluído.
    if (record.type === 'medication' && daysUntilISO(date) < 0) continue;
    const daysUntil = daysUntilISO(date);
    const window = record.reminderDays?.length
      ? Math.max(...record.reminderDays)
      : DEFAULT_REMINDER_DAYS;
    events.push({
      key: `${record.id}-event`,
      petId: pet.id,
      petName: pet.name,
      petPhoto: pet.photo,
      recordId: record.id,
      type: record.type,
      title: `${EVENT_LABELS[record.type]} · ${record.title}`,
      date,
      daysUntil,
      overdue: daysUntil < 0,
      pending: daysUntil < 0 || daysUntil <= window,
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/** Sem data final e sem uso contínuo, o remédio conta como ativo por este prazo. */
const OPEN_MEDICATION_ACTIVE_DAYS = 30;

/** Medicamento em uso: contínuo, com fim no futuro ou iniciado recentemente. */
export function isActiveMedication(record: MedicalRecord): boolean {
  if (record.type !== 'medication') return false;
  if (record.frequency === 'continuous') return true;
  if (!record.endDate) {
    return daysUntilISO(record.date) >= -OPEN_MEDICATION_ACTIVE_DAYS;
  }
  return daysUntilISO(record.endDate) >= 0;
}
