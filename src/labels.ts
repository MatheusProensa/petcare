import { Ionicons } from '@expo/vector-icons';
import { Species, RecordType, Frequency, DocumentKind, VaccineType } from './types';
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
  memory: 'Memória',
};

export function recordTypeColors(colors: Palette): Record<RecordType, string> {
  return {
    vaccine: colors.success,
    consultation: colors.info,
    medication: colors.warning,
    deworming: colors.accent,
    note: colors.textSubtle,
    memory: colors.accent,
  };
}

export const RECORD_TYPE_ICONS: Record<RecordType, keyof typeof Ionicons.glyphMap> = {
  vaccine: 'shield-checkmark',
  consultation: 'medical',
  medication: 'medkit',
  deworming: 'bug',
  note: 'document-text',
  memory: 'heart',
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

/**
 * Rótulos das categorias de proteção de vacinas.
 * Marcas diferentes da mesma categoria cobrem as mesmas doenças.
 */
/** Rótulo completo — usado nos cards da carteira de vacinação. */
export const VACCINE_TYPE_LABELS: Record<VaccineType, string> = {
  v8: 'V8 — DHPPI + Lepto',
  v10: 'V10 — DHPPI + Lepto + Corona',
  rabies: 'Antirrábica',
  leishmania: 'Leishmaniose',
  giardia: 'Giardia',
  bordetella: 'Bordetella (Tosse dos Canis)',
  feline_triple: 'Tríplice Felina (HCV)',
  feline_quadruple: 'Quádrupla Felina (HCV + Raiva)',
  feline_leukemia: 'Leucemia Felina (FeLV)',
  other: 'Outra',
};

/** Rótulo curto — usado nos chips do formulário. */
export const VACCINE_TYPE_SHORT_LABELS: Record<VaccineType, string> = {
  v8: 'V8',
  v10: 'V10',
  rabies: 'Antirrábica',
  leishmania: 'Leishmaniose',
  giardia: 'Giardia',
  bordetella: 'Bordetella',
  feline_triple: 'Tríplice Felina',
  feline_quadruple: 'Quádrupla Felina',
  feline_leukemia: 'Leucemia Felina',
  other: 'Outra',
};

/** Título do formulário de criação por tipo, com gênero correto. */
export const NEW_RECORD_LABELS: Record<RecordType, string> = {
  vaccine:      'Nova Vacina',
  consultation: 'Nova Consulta',
  medication:   'Novo Remédio',
  deworming:    'Novo Vermífugo',
  note:         'Nova Observação',
  memory:       'Nova Memória',
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
