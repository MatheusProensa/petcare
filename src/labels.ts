import { Ionicons } from '@expo/vector-icons';
import { Species, RecordType, Frequency, DocumentKind } from './types';
import { Palette } from './theme';

export const SPECIES_LABELS: Record<Species, string> = {
  dog: 'Cão',
  cat: 'Gato',
  bird: 'Pássaro',
  other: 'Outro',
};

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  vaccine: 'Vacina',
  consultation: 'Consulta',
  medication: 'Remédio',
  deworming: 'Vermífugo',
  note: 'Observação',
};

export function recordTypeColors(colors: Palette): Record<RecordType, string> {
  return {
    vaccine: colors.success,
    consultation: colors.info,
    medication: colors.warning,
    deworming: colors.accent,
    note: colors.textSubtle,
  };
}

export const RECORD_TYPE_ICONS: Record<RecordType, keyof typeof Ionicons.glyphMap> = {
  vaccine: 'shield-checkmark',
  consultation: 'medical',
  medication: 'medkit',
  deworming: 'bug',
  note: 'document-text',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once_daily: '1x ao dia',
  twice_daily: '2x ao dia',
  every_8h: 'A cada 8h',
  every_12h: 'A cada 12h',
  continuous: 'Uso contínuo',
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  exam: 'Exame',
  prescription: 'Receita',
  vaccination_card: 'Carteirinha',
  other: 'Outro',
};

export const DOCUMENT_KIND_ICONS: Record<DocumentKind, keyof typeof Ionicons.glyphMap> = {
  exam: 'document-text',
  prescription: 'receipt',
  vaccination_card: 'shield-checkmark',
  other: 'document',
};

/** Opções de antecedência para lembretes (em dias antes do evento). */
export const REMINDER_OPTIONS: { days: number; label: string }[] = [
  { days: 0, label: 'No dia' },
  { days: 1, label: '1 dia antes' },
  { days: 3, label: '3 dias antes' },
  { days: 7, label: '7 dias antes' },
  { days: 15, label: '15 dias antes' },
  { days: 30, label: '30 dias antes' },
];
