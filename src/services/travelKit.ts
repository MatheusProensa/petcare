import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Pet, MedicalRecord, MedicalProfile, TutorInfo } from '../types';
import { FREQUENCY_LABELS } from '../labels';
import { displayDate } from '../utils/date';
import { isActiveMedication } from './events';

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

/** Última vacina aplicada de cada nome (uma linha por vacina, mais recente). */
function latestVaccinesByTitle(records: MedicalRecord[]): MedicalRecord[] {
  const vaccines = records.filter(r => r.type === 'vaccine').sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const result: MedicalRecord[] = [];
  for (const v of vaccines) {
    const key = v.title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(v);
  }
  return result;
}

export function buildTravelKitHtml(
  pet: Pet,
  tutor: TutorInfo,
  vaccineRecords: MedicalRecord[],
  medicalProfile: MedicalProfile | undefined,
  activeMeds: MedicalRecord[],
  logo: string | null,
): string {
  const vaccines = latestVaccinesByTitle(vaccineRecords);

  const vaccineRows = vaccines
    .map(
      v => `
        <tr>
          <td><strong>${esc(v.title)}</strong></td>
          <td class="date">${displayDate(v.date)}</td>
          <td class="date">${v.nextDate ? `Reforço: ${displayDate(v.nextDate)}` : '—'}</td>
        </tr>`,
    )
    .join('');

  const medRows = activeMeds
    .map(
      m => `
        <tr>
          <td><strong>${esc(m.title)}</strong></td>
          <td>${[m.dosage, m.frequency ? FREQUENCY_LABELS[m.frequency] : undefined].filter((v): v is string => !!v).map(esc).join(' · ')}</td>
        </tr>`,
    )
    .join('');

  const healthRows: string[] = [];
  if (medicalProfile?.allergies) healthRows.push(`<tr><td>Alergias</td><td>${esc(medicalProfile.allergies)}</td></tr>`);
  if (medicalProfile?.chronicConditions)
    healthRows.push(`<tr><td>Doenças crônicas</td><td>${esc(medicalProfile.chronicConditions)}</td></tr>`);
  if (medicalProfile?.bloodType) healthRows.push(`<tr><td>Tipo sanguíneo</td><td>${esc(medicalProfile.bloodType)}</td></tr>`);
  if (medicalProfile?.notes) healthRows.push(`<tr><td>Observações</td><td>${esc(medicalProfile.notes)}</td></tr>`);

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
  .date { white-space: nowrap; color: ${MUTED}; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #EEF2F7; color: ${MUTED}; font-size: 11px; display: flex; justify-content: space-between; }
  .footer .brand { color: ${ORANGE}; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" />` : `<h1 style="color:${ORANGE}">PetCare</h1>`}
    <div class="doc-title">Kit Viagem<br/>${new Date().toLocaleDateString('pt-BR')}</div>
  </div>

  <h1>${esc(pet.name)}</h1>
  <div class="subtitle">Documento de viagem com informações essenciais de saúde</div>

  <h2>Tutor</h2>
  <table class="profile">
    <tr><td>Nome</td><td>${tutor.name ? esc(tutor.name) : 'Não informado'}</td></tr>
    <tr><td>Telefone</td><td>${tutor.phone ? esc(tutor.phone) : 'Não informado'}</td></tr>
  </table>

  ${
    medicalProfile?.vetName || medicalProfile?.vetPhone
      ? `<h2>Veterinário</h2><table class="profile">
          <tr><td>Nome</td><td>${medicalProfile.vetName ? esc(medicalProfile.vetName) : 'Não informado'}</td></tr>
          <tr><td>Telefone</td><td>${medicalProfile.vetPhone ? esc(medicalProfile.vetPhone) : 'Não informado'}</td></tr>
        </table>`
      : ''
  }

  ${healthRows.length ? `<h2>Saúde</h2><table class="profile">${healthRows.join('')}</table>` : ''}

  ${
    vaccineRows
      ? `<h2>Vacinas</h2><table>${vaccineRows}</table>`
      : '<h2>Vacinas</h2><p>Nenhuma vacina registrada.</p>'
  }

  ${
    medRows
      ? `<h2>Medicamentos em uso</h2><table>${medRows}</table>`
      : ''
  }

  <div class="footer">
    <span>Gerado pelo app <span class="brand">PetCare</span></span>
    <span>Boa viagem! ♡</span>
  </div>
</body>
</html>`;
}

export async function shareTravelKitPdf(pet: Pet, tutor: TutorInfo, records: MedicalRecord[]): Promise<void> {
  const logo = await logoDataUri();
  const vaccineRecords = records.filter(r => r.type === 'vaccine');
  const activeMeds = records.filter(isActiveMedication);
  const html = buildTravelKitHtml(pet, tutor, vaccineRecords, pet.medicalProfile, activeMeds, logo);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Kit Viagem de ${pet.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
