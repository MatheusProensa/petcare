import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, MedicalRecord, Species, RecordType } from '../types';
import { deletePhoto } from './photos';

const KEYS = {
  PETS: '@petcare:pets',
  RECORDS: '@petcare:records',
};

const SCHEMA_VERSION = 1;

interface Envelope<T> {
  version: number;
  data: T[];
}

// Versões antigas gravavam um array puro com espécie/tipo em português.
const LEGACY_SPECIES: Record<string, Species> = {
  'Cão': 'dog',
  'Gato': 'cat',
  'Pássaro': 'bird',
  'Outro': 'other',
};

const LEGACY_RECORD_TYPES: Record<string, RecordType> = {
  'Vacina': 'vaccine',
  'Consulta': 'consultation',
  'Remédio': 'medication',
};

function migratePet(pet: Pet & { species: string }): Pet {
  return { ...pet, species: LEGACY_SPECIES[pet.species] ?? (pet.species as Species) };
}

function migrateRecord(record: MedicalRecord & { type: string }): MedicalRecord {
  return { ...record, type: LEGACY_RECORD_TYPES[record.type] ?? (record.type as RecordType) };
}

async function write(key: string, data: unknown[]): Promise<void> {
  const envelope: Envelope<unknown> = { version: SCHEMA_VERSION, data };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

// Não engole erros: se os dados estiverem corrompidos, é melhor falhar
// (e a tela avisar) do que retornar [] e deixar um save sobrescrever tudo.
async function read<T>(key: string, migrateLegacy: (item: T) => T): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as T[] | Envelope<T>;
  if (Array.isArray(parsed)) {
    const data = parsed.map(migrateLegacy);
    await write(key, data);
    return data;
  }
  return parsed.data;
}

async function readPets(): Promise<Pet[]> {
  return read(KEYS.PETS, migratePet);
}

async function readRecords(): Promise<MedicalRecord[]> {
  return read(KEYS.RECORDS, migrateRecord);
}

export async function getPets(): Promise<Pet[]> {
  return readPets();
}

export async function savePet(pet: Pet): Promise<void> {
  const pets = await readPets();
  const idx = pets.findIndex(p => p.id === pet.id);
  if (idx >= 0) {
    pets[idx] = pet;
  } else {
    pets.push(pet);
  }
  await write(KEYS.PETS, pets);
}

export async function deletePet(petId: string): Promise<void> {
  const pets = await readPets();
  await deletePhoto(pets.find(p => p.id === petId)?.photo);
  await write(KEYS.PETS, pets.filter(p => p.id !== petId));

  const records = await readRecords();
  await write(KEYS.RECORDS, records.filter(r => r.petId !== petId));
}

export async function getRecords(petId: string): Promise<MedicalRecord[]> {
  const all = await readRecords();
  return all.filter(r => r.petId === petId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveRecord(record: MedicalRecord): Promise<void> {
  const records = await readRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await write(KEYS.RECORDS, records);
}

export async function deleteRecord(recordId: string): Promise<void> {
  const records = await readRecords();
  await write(KEYS.RECORDS, records.filter(r => r.id !== recordId));
}
