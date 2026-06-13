import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Pet, MedicalRecord, WeightEntry } from '../types';
import { SPECIES_LABELS, RECORD_TYPE_LABELS, FREQUENCY_LABELS } from '../labels';
import { displayDate, calcAge } from '../utils/date';

// Paleta da marca (mesma do tema claro — o PDF tem fundo branco)
const ORANGE = '#E66A3A';
const NAVY = '#1B2940';
const MUTED = '#64748B';

async function logoDataUri(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(require('../../assets/logo-light.png'));
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function recordDetails(r: MedicalRecord): string {
  const parts: string[] = [];
  if (r.type === 'vaccine' && r.nextDate) parts.push(`Reforço: ${displayDate(r.nextDate)}`);
  if (r.type === 'consultation' && r.diagnosis) parts.push(`Diagnóstico: ${r.diagnosis}`);
  if (r.type === 'medication' && r.frequency) parts.push(FREQUENCY_LABELS[r.frequency]);
  if (r.description) parts.push(r.description);
  return parts.map(esc).join(' · ');
}

export function buildPetHtml(
  pet: Pet,
  records: MedicalRecord[],
  weights: WeightEntry[],
  logo: string | null,
): string {
  const age = calcAge(pet.birthDate);
  const subtitle = [SPECIES_LABELS[pet.species], pet.breed, age].filter(Boolean).join(' · ');
  const profile = pet.medicalProfile;
  const latest = weights[0];

  const profileRows: string[] = [];
  if (profile) {
    profileRows.push(`<tr><td>Castrado</td><td>${profile.neutered ? 'Sim' : 'Não'}</td></tr>`);
    if (profile.allergies)
      profileRows.push(`<tr><td>Alergias</td><td>${esc(profile.allergies)}</td></tr>`);
    if (profile.chronicConditions)
      profileRows.push(`<tr><td>Doenças crônicas</td><td>${esc(profile.chronicConditions)}</td></tr>`);
    if (profile.bloodType)
      profileRows.push(`<tr><td>Tipo sanguíneo</td><td>${esc(profile.bloodType)}</td></tr>`);
    if (profile.vetName)
      profileRows.push(
        `<tr><td>Veterinário</td><td>${esc(profile.vetName)}${
          profile.vetPhone ? ` (${esc(profile.vetPhone)})` : ''
        }</td></tr>`,
      );
    if (profile.notes)
      profileRows.push(`<tr><td>Observações</td><td>${esc(profile.notes)}</td></tr>`);
  }
  if (latest) {
    profileRows.push(
      `<tr><td>Peso atual</td><td>${latest.weightKg.toLocaleString('pt-BR')} kg (${displayDate(latest.date)})</td></tr>`,
    );
  }

  const historyRows = records
    .map(
      r => `
        <tr>
          <td class="date">${displayDate(r.date)}</td>
          <td><span class="badge">${RECORD_TYPE_LABELS[r.type]}</span></td>
          <td><strong>${esc(r.title)}</strong>${
            recordDetails(r) ? `<div class="details">${recordDetails(r)}</div>` : ''
          }</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: ${NAVY}; padding: 32px 40px; font-size: 13px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${ORANGE}; padding-bottom: 16px; margin-bottom: 24px; }
  .header img { height: 56px; }
  .header .doc-title { text-align: right; color: ${MUTED}; font-size: 12px; }
  h1 { font-size: 22px; margin-bottom: 2px; }
  .subtitle { color: ${MUTED}; margin-bottom: 20px; }
  h2 { font-size: 14px; color: ${ORANGE}; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 8px; border-bottom: 1px solid #EEF2F7; vertical-align: top; }
  .profile td:first-child { color: ${MUTED}; width: 160px; }
  .date { white-space: nowrap; color: ${MUTED}; width: 90px; }
  .badge { background: ${ORANGE}1A; color: ${ORANGE}; border-radius: 99px; padding: 2px 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .details { color: ${MUTED}; margin-top: 2px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #EEF2F7; color: ${MUTED}; font-size: 11px; display: flex; justify-content: space-between; }
  .footer .brand { color: ${ORANGE}; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" />` : `<h1 style="color:${ORANGE}">PetCare</h1>`}
    <div class="doc-title">Prontuário<br/>${new Date().toLocaleDateString('pt-BR')}</div>
  </div>

  <h1>${esc(pet.name)}</h1>
  <div class="subtitle">${esc(subtitle)}${
    pet.birthDate ? ` · Nascimento: ${displayDate(pet.birthDate)}` : ''
  }</div>

  ${profileRows.length ? `<h2>Perfil Médico</h2><table class="profile">${profileRows.join('')}</table>` : ''}

  ${historyRows ? `<h2>Histórico</h2><table>${historyRows}</table>` : '<p>Nenhum registro no prontuário.</p>'}

  <div class="footer">
    <span>Gerado pelo app <span class="brand">PetCare</span></span>
    <span>Cuidar é o nosso compromisso ♡</span>
  </div>
</body>
</html>`;
}

export async function sharePetPdf(
  pet: Pet,
  records: MedicalRecord[],
  weights: WeightEntry[],
): Promise<void> {
  const logo = await logoDataUri();
  const html = buildPetHtml(pet, records, weights, logo);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Prontuário de ${pet.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
