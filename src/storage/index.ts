import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, MedicalRecord } from '../types';

const KEYS = {
  PETS: '@petcare:pets',
  RECORDS: '@petcare:records',
};

async function read<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch {
    return [];
  }
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getPets(): Promise<Pet[]> {
  return read<Pet>(KEYS.PETS);
}

export async function savePet(pet: Pet): Promise<void> {
  const pets = await getPets();
  const idx = pets.findIndex(p => p.id === pet.id);
  if (idx >= 0) {
    pets[idx] = pet;
  } else {
    pets.push(pet);
  }
  await write(KEYS.PETS, pets);
}

export async function deletePet(petId: string): Promise<void> {
  const pets = await getPets();
  await write(KEYS.PETS, pets.filter(p => p.id !== petId));

  const records = await read<MedicalRecord>(KEYS.RECORDS);
  await write(KEYS.RECORDS, records.filter(r => r.petId !== petId));
}

export async function getRecords(petId: string): Promise<MedicalRecord[]> {
  const all = await read<MedicalRecord>(KEYS.RECORDS);
  return all.filter(r => r.petId === petId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveRecord(record: MedicalRecord): Promise<void> {
  const records = await read<MedicalRecord>(KEYS.RECORDS);
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await write(KEYS.RECORDS, records);
}

export async function deleteRecord(recordId: string): Promise<void> {
  const records = await read<MedicalRecord>(KEYS.RECORDS);
  await write(KEYS.RECORDS, records.filter(r => r.id !== recordId));
}
