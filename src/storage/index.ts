import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Pet,
  MedicalRecord,
  WeightEntry,
  PetDocument,
  TutorInfo,
  MedicationDose,
  Species,
  RecordType,
} from '../types';
import { deletePhoto, deleteDocumentFile } from './files';
import { buildDemoData } from '../services/demoData';

const KEYS = {
  PETS: '@petcare:pets',
  RECORDS: '@petcare:records',
  WEIGHTS: '@petcare:weights',
  DOCUMENTS: '@petcare:documents',
  TUTOR: '@petcare:tutor',
  MEDICATION_DOSES: '@petcare:medication_doses',
  ONBOARDING_SEEN: '@petcare:onboarding_seen',
  LAST_BACKUP: '@petcare:last_backup',
  NOTIF_BANNER_DISMISSED: '@petcare:notif_banner_dismissed',
};

const PETS_VERSION = 1;
const RECORDS_VERSION = 2;
const WEIGHTS_VERSION = 1;
const DOCUMENTS_VERSION = 1;
const MEDICATION_DOSES_VERSION = 1;

interface Envelope<T> {
  version: number;
  data: T[];
}

// ---------------------------------------------------------------------------
// Migrações
// v0: array puro com espécie/tipo em português
// v1 (records): campo único `description` + `nextDate` genérico
// v2 (records): `title` obrigatório + campos específicos por tipo
// ---------------------------------------------------------------------------

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

function migratePetV0(pet: Pet & { species: string }): Pet {
  return { ...pet, species: LEGACY_SPECIES[pet.species] ?? (pet.species as Species) };
}

function migrateRecordV0(record: MedicalRecord & { type: string }): MedicalRecord {
  return { ...record, type: LEGACY_RECORD_TYPES[record.type] ?? (record.type as RecordType) };
}

interface RecordV1 {
  id: string;
  petId: string;
  type: RecordType;
  date: string;
  description: string;
  nextDate?: string;
  createdAt: string;
}

function migrateRecordV1(record: RecordV1): MedicalRecord {
  const { description, nextDate, ...base } = record;
  const migrated: MedicalRecord = { ...base, title: description || 'Registro' };
  if (nextDate) {
    if (record.type === 'medication') {
      migrated.endDate = nextDate;
    } else {
      migrated.nextDate = nextDate;
    }
  }
  return migrated;
}

// ---------------------------------------------------------------------------
// Leitura/escrita com envelope versionado
// Não engole erros: se os dados estiverem corrompidos, é melhor falhar
// (e a tela avisar) do que retornar [] e deixar um save sobrescrever tudo.
// ---------------------------------------------------------------------------

async function write(key: string, version: number, data: unknown[]): Promise<void> {
  const envelope: Envelope<unknown> = { version, data };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

function parseRaw<T>(raw: string): { version: number; data: T[] } {
  const parsed = JSON.parse(raw) as T[] | Envelope<T>;
  if (Array.isArray(parsed)) return { version: 0, data: parsed };
  return { version: parsed.version, data: parsed.data };
}

async function readPets(): Promise<Pet[]> {
  const raw = await AsyncStorage.getItem(KEYS.PETS);
  if (!raw) return [];
  const { version, data } = parseRaw<Pet>(raw);
  if (version === 0) {
    const migrated = data.map(migratePetV0);
    await write(KEYS.PETS, PETS_VERSION, migrated);
    return migrated;
  }
  return data;
}

async function readRecords(): Promise<MedicalRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.RECORDS);
  if (!raw) return [];
  let { version, data } = parseRaw<MedicalRecord>(raw);
  const original = version;
  if (version === 0) {
    data = data.map(migrateRecordV0);
    version = 1;
  }
  if (version === 1) {
    data = (data as unknown as RecordV1[]).map(migrateRecordV1);
    version = 2;
  }
  if (version !== original) {
    await write(KEYS.RECORDS, RECORDS_VERSION, data);
  }
  return data;
}

async function readWeights(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.WEIGHTS);
  if (!raw) return [];
  return parseRaw<WeightEntry>(raw).data;
}

async function readDocuments(): Promise<PetDocument[]> {
  const raw = await AsyncStorage.getItem(KEYS.DOCUMENTS);
  if (!raw) return [];
  return parseRaw<PetDocument>(raw).data;
}

async function readMedicationDoses(): Promise<MedicationDose[]> {
  const raw = await AsyncStorage.getItem(KEYS.MEDICATION_DOSES);
  if (!raw) return [];
  return parseRaw<MedicationDose>(raw).data;
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex(x => x.id === item.id);
  if (idx >= 0) {
    const copy = [...list];
    copy[idx] = item;
    return copy;
  }
  return [...list, item];
}

// --------------------------------- Pets -----------------------------------

export async function getPets(): Promise<Pet[]> {
  return readPets();
}

export async function savePet(pet: Pet): Promise<void> {
  const pets = await readPets();
  await write(KEYS.PETS, PETS_VERSION, upsert(pets, pet));
}

export async function deletePet(petId: string): Promise<void> {
  const pets = await readPets();
  await deletePhoto(pets.find(p => p.id === petId)?.photo);
  await write(KEYS.PETS, PETS_VERSION, pets.filter(p => p.id !== petId));

  const records = await readRecords();
  for (const record of records) {
    if (record.petId === petId && record.photos) {
      for (const uri of record.photos) await deletePhoto(uri);
    }
  }
  await write(KEYS.RECORDS, RECORDS_VERSION, records.filter(r => r.petId !== petId));

  const weights = await readWeights();
  await write(KEYS.WEIGHTS, WEIGHTS_VERSION, weights.filter(w => w.petId !== petId));

  const documents = await readDocuments();
  const toDelete = documents.filter(d => d.petId === petId);
  for (const doc of toDelete) {
    await deleteDocumentFile(doc.uri);
  }
  await write(KEYS.DOCUMENTS, DOCUMENTS_VERSION, documents.filter(d => d.petId !== petId));
}

// -------------------------------- Registros --------------------------------

export async function getAllRecords(): Promise<MedicalRecord[]> {
  return readRecords();
}

export async function getRecords(petId: string): Promise<MedicalRecord[]> {
  const all = await readRecords();
  return all.filter(r => r.petId === petId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveRecord(record: MedicalRecord): Promise<void> {
  const records = await readRecords();
  await write(KEYS.RECORDS, RECORDS_VERSION, upsert(records, record));
}

export async function deleteRecord(recordId: string): Promise<void> {
  const records = await readRecords();
  await write(KEYS.RECORDS, RECORDS_VERSION, records.filter(r => r.id !== recordId));

  const doses = await readMedicationDoses();
  await write(
    KEYS.MEDICATION_DOSES,
    MEDICATION_DOSES_VERSION,
    doses.filter(d => d.recordId !== recordId),
  );
}

// ---------------------------------- Peso -----------------------------------

export async function getAllWeights(): Promise<WeightEntry[]> {
  return readWeights();
}

export async function getWeights(petId: string): Promise<WeightEntry[]> {
  const all = await readWeights();
  return all.filter(w => w.petId === petId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveWeight(entry: WeightEntry): Promise<void> {
  const weights = await readWeights();
  await write(KEYS.WEIGHTS, WEIGHTS_VERSION, upsert(weights, entry));
}

export async function deleteWeight(weightId: string): Promise<void> {
  const weights = await readWeights();
  await write(KEYS.WEIGHTS, WEIGHTS_VERSION, weights.filter(w => w.id !== weightId));
}

// ------------------------------- Documentos --------------------------------

export async function getDocuments(petId: string): Promise<PetDocument[]> {
  const all = await readDocuments();
  return all.filter(d => d.petId === petId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveDocument(doc: PetDocument): Promise<void> {
  const documents = await readDocuments();
  await write(KEYS.DOCUMENTS, DOCUMENTS_VERSION, upsert(documents, doc));
}

export async function deleteDocument(documentId: string): Promise<void> {
  const documents = await readDocuments();
  await deleteDocumentFile(documents.find(d => d.id === documentId)?.uri);
  await write(KEYS.DOCUMENTS, DOCUMENTS_VERSION, documents.filter(d => d.id !== documentId));
}

// ----------------------------- Doses de remédio -----------------------------

export async function getMedicationDoses(petId: string): Promise<MedicationDose[]> {
  const all = await readMedicationDoses();
  return all.filter(d => d.petId === petId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveMedicationDose(dose: MedicationDose): Promise<void> {
  const doses = await readMedicationDoses();
  await write(KEYS.MEDICATION_DOSES, MEDICATION_DOSES_VERSION, upsert(doses, dose));
}

export async function deleteMedicationDose(doseId: string): Promise<void> {
  const doses = await readMedicationDoses();
  await write(KEYS.MEDICATION_DOSES, MEDICATION_DOSES_VERSION, doses.filter(d => d.id !== doseId));
}

// -------------------------------- Onboarding --------------------------------

export async function getOnboardingSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.ONBOARDING_SEEN)) === 'true';
}

export async function setOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_SEEN, 'true');
}

// ------------------------- Notification banner -----------------------------

export async function getNotifBannerDismissed(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.NOTIF_BANNER_DISMISSED)) === 'true';
}

export async function setNotifBannerDismissed(): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIF_BANNER_DISMISSED, 'true');
}

// ---------------------------------- Tutor ----------------------------------

export async function getTutorInfo(): Promise<TutorInfo> {
  const raw = await AsyncStorage.getItem(KEYS.TUTOR);
  return raw ? (JSON.parse(raw) as TutorInfo) : { name: '', phone: '' };
}

export async function saveTutorInfo(info: TutorInfo): Promise<void> {
  await AsyncStorage.setItem(KEYS.TUTOR, JSON.stringify(info));
}

// --------------------------------- Backup ----------------------------------

const BACKUP_VERSION = 1;

export interface Backup {
  backupVersion: number;
  exportedAt: string;
  pets: Pet[];
  records: MedicalRecord[];
  weights: WeightEntry[];
  documents: PetDocument[];
  medicationDoses?: MedicationDose[];
  tutor: TutorInfo;
}

export async function getLastBackupDate(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LAST_BACKUP);
}

export async function setLastBackupDate(isoDate: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_BACKUP, isoDate);
}

export async function exportBackup(): Promise<string> {
  const exportedAt = new Date().toISOString();
  const backup: Backup = {
    backupVersion: BACKUP_VERSION,
    exportedAt,
    pets: await readPets(),
    records: await readRecords(),
    weights: await readWeights(),
    documents: await readDocuments(),
    medicationDoses: await readMedicationDoses(),
    tutor: await getTutorInfo(),
  };
  await setLastBackupDate(exportedAt);
  return JSON.stringify(backup, null, 2);
}

/** Lê o resumo de um backup (contagens + data de exportação) sem aplicar nada. */
export function peekBackupSummary(json: string): {
  pets: number;
  records: number;
  exportedAt?: string;
} {
  const parsed = JSON.parse(json) as Backup;
  return {
    pets: Array.isArray(parsed.pets) ? parsed.pets.length : 0,
    records: Array.isArray(parsed.records) ? parsed.records.length : 0,
    exportedAt: parsed.exportedAt,
  };
}

/**
 * Substitui todos os dados pelos do backup. Fotos e arquivos de documentos
 * não fazem parte do JSON — apenas as referências (URI) são restauradas.
 * Em um restore no mesmo aparelho os arquivos persistidos continuam
 * existindo e as fotos/documentos seguem funcionando; em outro aparelho
 * essas referências ficam inválidas e a foto/documento some.
 */
/** Arquivo local persistido (foto/documento) cuja referência pode não existir mais neste aparelho. */
async function localFileExists(uri?: string): Promise<boolean> {
  if (!uri) return false;
  if (Platform.OS === 'web' || !uri.startsWith('file://')) return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

export async function importBackup(json: string): Promise<{ pets: number; records: number }> {
  const parsed = JSON.parse(json) as Backup;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof parsed.backupVersion !== 'number' ||
    !Array.isArray(parsed.pets) ||
    !Array.isArray(parsed.records) ||
    !Array.isArray(parsed.weights)
  ) {
    throw new Error('Arquivo de backup inválido.');
  }
  const documents = Array.isArray(parsed.documents) ? parsed.documents : [];

  // Em outro aparelho (ou após reinstalar) as URIs de fotos/documentos deixam de existir;
  // limpamos essas referências para não exibir imagens/arquivos quebrados.
  const pets = await Promise.all(
    parsed.pets.map(async pet => {
      if (pet.photo && !(await localFileExists(pet.photo))) {
        return { ...pet, photo: undefined };
      }
      return pet;
    }),
  );
  const validDocuments: PetDocument[] = [];
  for (const doc of documents) {
    if (await localFileExists(doc.uri)) validDocuments.push(doc);
  }

  const records = await Promise.all(
    parsed.records.map(async record => {
      let result = record;
      if (result.photo && !(await localFileExists(result.photo))) {
        result = { ...result, photo: undefined };
      }
      if (result.photos?.length) {
        const validPhotos: string[] = [];
        for (const uri of result.photos) {
          if (await localFileExists(uri)) validPhotos.push(uri);
        }
        result = { ...result, photos: validPhotos.length ? validPhotos : undefined };
      }
      return result;
    }),
  );

  await write(KEYS.PETS, PETS_VERSION, pets);
  await write(KEYS.RECORDS, RECORDS_VERSION, records);
  await write(KEYS.WEIGHTS, WEIGHTS_VERSION, parsed.weights);
  await write(KEYS.DOCUMENTS, DOCUMENTS_VERSION, validDocuments);
  await write(
    KEYS.MEDICATION_DOSES,
    MEDICATION_DOSES_VERSION,
    Array.isArray(parsed.medicationDoses) ? parsed.medicationDoses : [],
  );
  if (parsed.tutor) await saveTutorInfo(parsed.tutor);
  return { pets: parsed.pets.length, records: parsed.records.length };
}

// ----------------------------------- Demo -----------------------------------

/** Substitui todos os dados pelo conjunto fictício de demonstração. */
export async function loadDemoData(): Promise<void> {
  const demo = buildDemoData();
  await write(KEYS.PETS, PETS_VERSION, demo.pets);
  await write(KEYS.RECORDS, RECORDS_VERSION, demo.records);
  await write(KEYS.WEIGHTS, WEIGHTS_VERSION, demo.weights);
  await write(KEYS.DOCUMENTS, DOCUMENTS_VERSION, demo.documents);
  await write(KEYS.MEDICATION_DOSES, MEDICATION_DOSES_VERSION, []);
  await saveTutorInfo(demo.tutor);
}
