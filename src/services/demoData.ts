import { Pet, MedicalRecord, WeightEntry, PetDocument, TutorInfo } from '../types';

/**
 * Conjunto fixo de dados fictícios para demonstração do app (modo demo).
 * Datas são geradas em relação a "hoje" para que vacinas/remédios sempre
 * apareçam com status realistas (próximos, atrasados, etc.).
 */

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface DemoData {
  pets: Pet[];
  records: MedicalRecord[];
  weights: WeightEntry[];
  documents: PetDocument[];
  tutor: TutorInfo;
}

export function buildDemoData(): DemoData {
  const now = new Date().toISOString();
  const pitocoId = 'demo-pitoco';
  const mimiId = 'demo-mimi';

  const pets: Pet[] = [
    {
      id: pitocoId,
      name: 'Pitoco',
      species: 'dog',
      breed: 'Labrador',
      birthDate: isoDaysFromNow(-365 * 3),
      medicalProfile: {
        neutered: true,
        allergies: 'Nenhuma conhecida',
        bloodType: 'DEA 1.1 positivo',
        vetName: 'Dra. Camila Souza',
        vetPhone: '(11) 98888-1234',
      },
      createdAt: `${isoDaysFromNow(-360)}T12:00:00.000Z`,
    },
    {
      id: mimiId,
      name: 'Mimi',
      species: 'cat',
      breed: 'Siamês',
      birthDate: isoDaysFromNow(-365 * 5),
      medicalProfile: {
        neutered: true,
        chronicConditions: 'Insuficiência renal leve (acompanhamento)',
        vetName: 'Dr. André Lima',
        vetPhone: '(11) 97777-5678',
      },
      createdAt: `${isoDaysFromNow(-400)}T12:00:00.000Z`,
    },
  ];

  const records: MedicalRecord[] = [
    {
      id: 'demo-rec-1',
      petId: pitocoId,
      type: 'vaccine',
      date: isoDaysFromNow(-300),
      title: 'V10 (Polivalente)',
      manufacturer: 'Zoetis',
      batch: 'LZ4421',
      clinic: 'Clínica VetCare',
      nextDate: isoDaysFromNow(20),
      createdAt: now,
    },
    {
      id: 'demo-rec-2',
      petId: pitocoId,
      type: 'consultation',
      date: isoDaysFromNow(-60),
      title: 'Check-up de rotina',
      vet: 'Dra. Camila Souza',
      diagnosis: 'Saudável, recomendado manter peso',
      clinic: 'Clínica VetCare',
      nextDate: isoDaysFromNow(120),
      createdAt: now,
    },
    {
      id: 'demo-rec-3',
      petId: pitocoId,
      type: 'medication',
      date: isoDaysFromNow(-10),
      title: 'Antialérgico',
      dosage: '1 comprimido de 10mg',
      frequency: 'once_daily',
      endDate: isoDaysFromNow(5),
      createdAt: now,
    },
    {
      id: 'demo-rec-4',
      petId: pitocoId,
      type: 'deworming',
      date: isoDaysFromNow(-90),
      title: 'Vermífugo',
      nextDate: isoDaysFromNow(-2),
      createdAt: now,
    },
    {
      id: 'demo-rec-5',
      petId: mimiId,
      type: 'vaccine',
      date: isoDaysFromNow(-200),
      title: 'Tríplice felina',
      manufacturer: 'MSD',
      clinic: 'Clínica VetCare',
      nextDate: isoDaysFromNow(-5),
      createdAt: now,
    },
    {
      id: 'demo-rec-6',
      petId: mimiId,
      type: 'medication',
      date: isoDaysFromNow(-30),
      title: 'Ração renal especial (suplemento)',
      dosage: '1/2 sachê',
      frequency: 'continuous',
      createdAt: now,
    },
    {
      id: 'demo-rec-7',
      petId: mimiId,
      type: 'note',
      date: isoDaysFromNow(-15),
      title: 'Observação',
      description: 'Apresentou menos apetite por 2 dias, voltou ao normal depois.',
      createdAt: now,
    },
    {
      id: 'demo-rec-8',
      petId: pitocoId,
      type: 'memory',
      date: isoDaysFromNow(-360),
      title: 'Chegou ao lar',
      description: 'Primeiro dia em casa, um pouco assustado mas já fazendo bagunça.',
      createdAt: now,
    },
    {
      id: 'demo-rec-9',
      petId: pitocoId,
      type: 'memory',
      date: isoDaysFromNow(-180),
      title: 'Primeiro passeio no parque',
      description: 'Adorou correr atrás dos pássaros e conhecer outros cães.',
      createdAt: now,
    },
    {
      id: 'demo-rec-10',
      petId: mimiId,
      type: 'memory',
      date: isoDaysFromNow(-400),
      title: 'Chegou ao lar',
      description: 'Curiosa desde o primeiro momento, explorou cada cantinho da casa.',
      createdAt: now,
    },
  ];

  const weights: WeightEntry[] = [
    { id: 'demo-w-1', petId: pitocoId, date: isoDaysFromNow(-150), weightKg: 28.5, createdAt: now },
    { id: 'demo-w-2', petId: pitocoId, date: isoDaysFromNow(-75), weightKg: 29.2, createdAt: now },
    { id: 'demo-w-3', petId: pitocoId, date: isoDaysFromNow(-5), weightKg: 29.8, createdAt: now },
    { id: 'demo-w-4', petId: mimiId, date: isoDaysFromNow(-120), weightKg: 4.1, createdAt: now },
    { id: 'demo-w-5', petId: mimiId, date: isoDaysFromNow(-30), weightKg: 4.0, createdAt: now },
    { id: 'demo-w-6', petId: mimiId, date: isoDaysFromNow(-3), weightKg: 3.9, createdAt: now },
  ];

  const documents: PetDocument[] = [
    {
      id: 'demo-doc-1',
      petId: pitocoId,
      title: 'Exame de sangue - hemograma',
      kind: 'exam',
      date: isoDaysFromNow(-60),
      uri: '',
      createdAt: now,
    },
  ];

  const tutor: TutorInfo = {
    name: 'Tutor Demonstração',
    phone: '(11) 90000-0000',
  };

  return { pets, records, weights, documents, tutor };
}
