export type Species = 'Cão' | 'Gato' | 'Pássaro' | 'Outro';
export type RecordType = 'Vacina' | 'Consulta' | 'Remédio';

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
