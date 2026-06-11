import { Share } from 'react-native';
import { Pet, MedicalRecord, WeightEntry } from '../types';
import { SPECIES_LABELS, RECORD_TYPE_LABELS, FREQUENCY_LABELS } from '../labels';
import { displayDate, calcAge } from '../utils/date';

/**
 * Monta um resumo em texto do prontuário, pronto para enviar por
 * WhatsApp/e-mail ao veterinário. A versão em PDF está prevista para
 * uma próxima versão (ver sharePetPdf).
 */
export function buildPetSummary(
  pet: Pet,
  records: MedicalRecord[],
  weights: WeightEntry[],
): string {
  const lines: string[] = [];
  const age = calcAge(pet.birthDate);

  lines.push(`🐾 PRONTUÁRIO — ${pet.name.toUpperCase()}`);
  lines.push(
    [SPECIES_LABELS[pet.species], pet.breed, age].filter(Boolean).join(' · '),
  );
  if (pet.birthDate) lines.push(`Nascimento: ${displayDate(pet.birthDate)}`);

  const profile = pet.medicalProfile;
  if (profile) {
    lines.push('');
    lines.push('PERFIL MÉDICO');
    lines.push(`Castrado: ${profile.neutered ? 'Sim' : 'Não'}`);
    if (profile.allergies) lines.push(`Alergias: ${profile.allergies}`);
    if (profile.chronicConditions) lines.push(`Doenças crônicas: ${profile.chronicConditions}`);
    if (profile.bloodType) lines.push(`Tipo sanguíneo: ${profile.bloodType}`);
    if (profile.vetName) {
      lines.push(`Veterinário: ${profile.vetName}${profile.vetPhone ? ` (${profile.vetPhone})` : ''}`);
    }
    if (profile.notes) lines.push(`Observações: ${profile.notes}`);
  }

  if (weights.length > 0) {
    const latest = weights[0];
    lines.push('');
    lines.push(`PESO ATUAL: ${latest.weightKg.toLocaleString('pt-BR')} kg (${displayDate(latest.date)})`);
  }

  if (records.length > 0) {
    lines.push('');
    lines.push('HISTÓRICO');
    for (const r of records) {
      const parts = [
        `${displayDate(r.date)} — ${RECORD_TYPE_LABELS[r.type]}: ${r.title}`,
      ];
      if (r.type === 'vaccine' && r.nextDate) parts.push(`reforço ${displayDate(r.nextDate)}`);
      if (r.type === 'consultation' && r.diagnosis) parts.push(`diagnóstico: ${r.diagnosis}`);
      if (r.type === 'medication' && r.frequency) parts.push(FREQUENCY_LABELS[r.frequency]);
      if (r.description) parts.push(r.description);
      lines.push(`• ${parts.join(' · ')}`);
    }
  }

  lines.push('');
  lines.push('Gerado pelo app PetCare');
  return lines.join('\n');
}

export async function sharePetSummary(
  pet: Pet,
  records: MedicalRecord[],
  weights: WeightEntry[],
): Promise<void> {
  const message = buildPetSummary(pet, records, weights);
  await Share.share({ message, title: `Prontuário de ${pet.name}` });
}

/**
 * Placeholder: exportação em PDF planejada para a próxima versão
 * (expo-print + expo-sharing). A estrutura de dados já suporta.
 */
export async function sharePetPdf(): Promise<'not_implemented'> {
  return 'not_implemented';
}
