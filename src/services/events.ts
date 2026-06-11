import { MedicalRecord, Pet, RecordType } from '../types';
import { daysUntilISO } from '../utils/date';

export type VaccineStatus = 'ok' | 'due_soon' | 'overdue';

/** Janela padrão de alerta quando o usuário não configurou lembrete. */
const DEFAULT_REMINDER_DAYS = 3;
/** Vacina fica "amarela" quando o reforço está a este número de dias ou menos. */
const VACCINE_DUE_SOON_DAYS = 15;

export function getVaccineStatus(record: MedicalRecord): VaccineStatus | null {
  if (record.type !== 'vaccine') return null;
  if (!record.nextDate) return 'ok';
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
  const events: UpcomingEvent[] = [];
  for (const record of records) {
    const date = eventDateOf(record);
    if (!date) continue;
    const pet = petById.get(record.petId);
    if (!pet) continue;
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

/** Medicamento em uso: contínuo, sem data final ou com fim no futuro. */
export function isActiveMedication(record: MedicalRecord): boolean {
  if (record.type !== 'medication') return false;
  if (record.frequency === 'continuous') return true;
  if (!record.endDate) return true;
  return daysUntilISO(record.endDate) >= 0;
}
