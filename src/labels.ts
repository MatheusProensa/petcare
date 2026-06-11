import { Species, RecordType } from './types';

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
};
