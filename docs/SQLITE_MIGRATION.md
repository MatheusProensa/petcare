# Plano de migração: AsyncStorage → SQLite

## Contexto

Hoje todo o estado do PetCare é persistido no `AsyncStorage` via `src/storage/index.ts`,
em chaves separadas por entidade (`@petcare:pets`, `@petcare:records`, etc.), cada uma
guardando um JSON `{ version, data: T[] }`. Isso funciona bem para o volume atual de
dados, mas tem limitações que aparecem conforme o histórico cresce:

- Toda leitura de uma entidade desserializa o array inteiro (sem índices, sem queries).
- Relacionamentos (pet → registros → doses de remédio) são resolvidos em memória,
  filtrando arrays a cada acesso.
- Não há transações reais: `importBackup` sobrescreve várias chaves em sequência.

Este documento descreve **como migrar para SQLite (via `expo-sqlite`) sem reescrever as
telas**, aproveitando a camada de repositórios criada em `src/repositories/`.

## Por que a camada de repositórios já ajuda

As telas tocadas nesta sessão (`DashboardScreen`, `PetDetailScreen`, `MedicationsScreen`,
`AboutScreen`, `OnboardingScreen`, `App.tsx`) não chamam mais `src/storage/index.ts`
diretamente — chamam objetos em `src/repositories/*.ts`
(`petsRepository`, `recordsRepository`, `weightsRepository`, `documentsRepository`,
`medicationsRepository`, `backupRepository`, `onboardingRepository`), que hoje apenas
reexportam as funções do `storage`. Quando a implementação trocar para SQLite, **só esses
módulos precisam mudar** — as telas continuam chamando `petsRepository.getAll()` etc.

As demais telas ainda importam de `../storage` diretamente. A migração pode ser feita em
fases: primeiro trocar a implementação por trás dos repositórios (cobrindo as telas já
migradas), depois ir criando/atualizando repositórios para as telas restantes conforme
forem sendo tocadas.

## Schema relacional proposto

```sql
CREATE TABLE pets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  birth_date TEXT,
  photo TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE medical_profiles (
  pet_id TEXT PRIMARY KEY REFERENCES pets(id) ON DELETE CASCADE,
  neutered INTEGER,
  allergies TEXT,
  chronic_conditions TEXT,
  blood_type TEXT,
  vet_name TEXT,
  vet_phone TEXT,
  notes TEXT
);

CREATE TABLE records (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  next_date TEXT,
  end_date TEXT,
  frequency TEXT,
  dosage TEXT,
  manufacturer TEXT,
  batch TEXT,
  clinic TEXT,
  vet TEXT,
  diagnosis TEXT,
  reminder_days TEXT,        -- JSON array serializado
  created_at TEXT NOT NULL
);
CREATE INDEX idx_records_pet ON records(pet_id);
CREATE INDEX idx_records_pet_type ON records(pet_id, type);

CREATE TABLE weights (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_weights_pet ON weights(pet_id);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  date TEXT NOT NULL,
  uri TEXT NOT NULL,
  mime_type TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_documents_pet ON documents(pet_id);

CREATE TABLE medication_doses (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_doses_record ON medication_doses(record_id);

CREATE TABLE tutor_info (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- linha única
  name TEXT,
  phone TEXT
);

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
); -- onboarding_seen, last_backup, schema_version, migrated_v3 etc.
```

## Estratégia de migração de dados existentes

1. **Detectar versão atual**: ao abrir o app, checar `app_meta['migrated_v3']`. Se ausente,
   executar a migração one-shot abaixo (reaproveita o padrão de versionamento já usado em
   `src/storage/index.ts`, onde cada entidade tem um número de versão).
2. **Ler os JSONs atuais do AsyncStorage** — exatamente como `exportBackup()` já faz hoje:
   `getPets()`, `getAllRecords()`, `getWeights` por pet, `getDocuments` por pet,
   `getMedicationDoses` por pet, `getTutorInfo()`.
3. **Inserir nas tabelas relacionais** em uma única transação SQLite (`db.withTransactionAsync`),
   mapeando cada `Pet.medicalProfile` para uma linha em `medical_profiles` e cada
   `MedicalRecord.reminderDays` (array) para uma string JSON na coluna `reminder_days`.
4. **Marcar `app_meta['migrated_v3'] = '1'`** ao final. Não apagar as chaves antigas do
   AsyncStorage imediatamente — mantê-las por uma versão como fallback/rollback, removendo
   em uma limpeza posterior.
5. **Backup/restore continuam funcionando**: `exportBackup`/`importBackup` passam a ler/
   escrever via SQL em vez de AsyncStorage, mas o formato do arquivo JSON exportado
   (`Backup` interface) não muda — compatibilidade com backups antigos é preservada.

## O que precisa trocar de implementação

Apenas os módulos em `src/repositories/`:

- `petsRepository` → `getAll`/`save`/`remove` passam a executar `SELECT`/`INSERT OR
  REPLACE`/`DELETE` em `pets` (+ `medical_profiles`).
- `recordsRepository` → `getByPet`/`getAll`/`save`/`remove` operam em `records`.
- `weightsRepository`, `documentsRepository`, `medicationsRepository` → idem para suas
  tabelas.
- `backupRepository` → `export`/`import` fazem `SELECT *` de todas as tabelas / `INSERT`
  em transação, mantendo o mesmo formato `Backup` JSON.
- `onboardingRepository` → `getSeen`/`setSeen` leem/escrevem `app_meta`.

**As telas não mudam.** Os repositórios mantêm a mesma assinatura (`Promise<T[]>`,
`Promise<void>`, etc.), então `DashboardScreen`, `PetDetailScreen`, `MedicationsScreen`,
`AboutScreen`, `OnboardingScreen` e `App.tsx` continuam funcionando sem alterações.

## Telas ainda não migradas para repositórios

`HomeScreen`, `AddPetScreen`, `AddRecordScreen`, `AddWeightScreen`, `WeightScreen`,
`VaccinesScreen`, `MedicalProfileScreen`, `EmergencyScreen`, `DocumentsScreen`,
`DocumentViewerScreen`, `StatsScreen`, `SearchScreen` continuam importando de
`../storage`. Para completar a migração, cada uma delas precisa trocar seus imports para
os repositórios equivalentes (todos já existem ou são extensões simples dos atuais) antes
da troca de implementação — caso contrário, continuariam lendo do AsyncStorage enquanto o
resto do app já estaria em SQLite.

## Ordem recomendada

1. Adicionar `expo-sqlite` e o módulo de schema/migração one-shot descrito acima.
2. Trocar a implementação dos repositórios já existentes (sem tocar nas telas).
3. Migrar as telas restantes para repositórios, tela por tela.
4. Após validar em produção por uma versão, remover as chaves antigas do AsyncStorage e
   o código de migração one-shot.
