// Chaves estáveis persistidas no storage — a tradução para exibição
// fica em src/labels.ts. Não renomear sem escrever migração.
export type Species = 'dog' | 'cat' | 'bird' | 'other';
export type RecordType = 'vaccine' | 'consultation' | 'medication' | 'deworming' | 'note';
export type Frequency = 'once_daily' | 'twice_daily' | 'every_8h' | 'every_12h' | 'continuous';
export type DocumentKind = 'exam' | 'prescription' | 'vaccination_card' | 'other';

export interface MedicalProfile {
  neutered?: boolean;
  allergies?: string;
  chronicConditions?: string;
  bloodType?: string;
  vetName?: string;
  vetPhone?: string;
  notes?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  birthDate: string;
  photo?: string;
  medicalProfile?: MedicalProfile;
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  type: RecordType;
  /** Data principal: aplicação, consulta, início do tratamento ou da observação. */
  date: string;
  /** Nome da vacina, motivo da consulta, nome do remédio ou título da observação. */
  title: string;
  /** Observações livres / descrição da observação. */
  description?: string;
  /** Reforço (vacina), retorno (consulta) ou próxima dose (vermífugo). */
  nextDate?: string;
  /** Fim do tratamento (medicamento). */
  endDate?: string;
  frequency?: Frequency;
  manufacturer?: string;
  batch?: string;
  clinic?: string;
  vet?: string;
  diagnosis?: string;
  /** Dias de antecedência escolhidos para lembrar do próximo evento. */
  reminderDays?: number[];
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  petId: string;
  date: string;
  weightKg: number;
  createdAt: string;
}

export interface PetDocument {
  id: string;
  petId: string;
  title: string;
  kind: DocumentKind;
  date: string;
  uri: string;
  mimeType?: string;
  createdAt: string;
}

export interface TutorInfo {
  name: string;
  phone: string;
}

export type RootStackParamList = {
  Dashboard: undefined;
  Home: undefined;
  AddPet: { petId?: string };
  PetDetail: { petId: string };
  AddRecord: { petId: string; recordId?: string; initialType?: RecordType };
  AddWeight: { petId: string; weightId?: string };
  Weight: { petId: string };
  Vaccines: { petId: string };
  MedicalProfile: { petId: string };
  Emergency: { petId: string };
  Documents: { petId: string; kind?: DocumentKind };
  DocumentViewer: { uri: string; title: string; mimeType?: string };
  Stats: { petId: string };
  Search: undefined;
};
