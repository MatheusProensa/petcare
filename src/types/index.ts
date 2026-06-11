// Chaves estáveis persistidas no storage — a tradução para exibição
// fica em src/labels.ts. Não renomear sem escrever migração.
export type Species = 'dog' | 'cat' | 'bird' | 'other';
export type RecordType = 'vaccine' | 'consultation' | 'medication';

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  birthDate: string;
  photo?: string;
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  type: RecordType;
  date: string;
  description: string;
  nextDate?: string;
  createdAt: string;
}

export type RootStackParamList = {
  Home: undefined;
  AddPet: { petId?: string };
  PetDetail: { petId: string };
  AddRecord: { petId: string; recordId?: string };
};
