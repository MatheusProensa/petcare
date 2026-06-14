import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Pet, MedicalRecord, WeightEntry, PetDocument, RecordType } from '../types';
import { RECORD_TYPE_LABELS, DOCUMENT_KIND_LABELS } from '../labels';
import { displayDate } from '../utils/date';

const ORANGE = '#E66A3A';
const NAVY = '#1B2940';
const MUTED = '#64748B';

const EMOJI: Record<RecordType | 'arrival' | 'weight' | 'document', string> = {
  arrival: '🐾',
  vaccine: '💉',
  consultation: '🏥',
  medication: '💊',
  deworming: '🐛',
  note: '📝',
  memory: '❤️',
  weight: '⚖️',
  document: '📄',
};

interface LifelineEntry {
  date: string;
  createdAt: string;
  kind: RecordType | 'arrival' | 'weight' | 'document';
  title: string;
  description?: string;
}

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

function buildTimeline(pet: Pet, records: MedicalRecord[], weights: WeightEntry[], documents: PetDocument[]): LifelineEntry[] {
  const entries: LifelineEntry[] = [
    ...records.map(r => ({
      date: r.date,
      createdAt: r.createdAt,
      kind: r.type,
      title: `${EMOJI[r.type]} ${r.title}`,
      description: [r.description, RECORD_TYPE_LABELS[r.type]].filter(Boolean).join(' · '),
    })),
    ...weights.map(w => ({
      date: w.date,
      createdAt: w.createdAt,
      kind: 'weight' as const,
      title: `${EMOJI.weight} Peso registrado: ${w.weightKg.toLocaleString('pt-BR')} kg`,
    })),
    ...documents.map(d => ({
      date: d.date,
      createdAt: d.createdAt,
      kind: 'document' as const,
      title: `${EMOJI.document} ${d.title}`,
      description: DOCUMENT_KIND_LABELS[d.kind],
    })),
  ];

  if (pet.createdAt) {
    entries.push({
      date: pet.createdAt.slice(0, 10),
      createdAt: pet.createdAt,
      kind: 'arrival',
      title: `${EMOJI.arrival} Chegou ao lar`,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export function buildLifelineHtml(pet: Pet, timeline: LifelineEntry[], logo: string | null): string {
  const groups = new Map<string, LifelineEntry[]>();
  for (const entry of timeline) {
    const year = entry.date.slice(0, 4);
    const group = groups.get(year);
    if (group) group.push(entry);
    else groups.set(year, [entry]);
  }

  const sections = Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([year, entries]) => `
        <h2>${year}</h2>
        <table>
          ${entries
            .map(
              e => `
            <tr>
              <td class="date">${displayDate(e.date)}</td>
              <td>
                <strong>${esc(e.title)}</strong>
                ${e.description ? `<div class="desc">${esc(e.description)}</div>` : ''}
              </td>
            </tr>`,
            )
            .join('')}
        </table>`,
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
  .date { white-space: nowrap; color: ${MUTED}; width: 100px; }
  .desc { color: ${MUTED}; font-size: 12px; margin-top: 2px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #EEF2F7; color: ${MUTED}; font-size: 11px; display: flex; justify-content: space-between; }
  .footer .brand { color: ${ORANGE}; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" />` : `<h1 style="color:${ORANGE}">PetCare</h1>`}
    <div class="doc-title">Linha da Vida<br/>${new Date().toLocaleDateString('pt-BR')}</div>
  </div>

  <h1>${esc(pet.name)}</h1>
  <div class="subtitle">A história completa, do primeiro dia até hoje</div>

  ${sections || '<p>Nenhum registro ainda.</p>'}

  <div class="footer">
    <span>Gerado pelo app <span class="brand">PetCare</span></span>
    <span>♡</span>
  </div>
</body>
</html>`;
}

export async function shareLifelinePdf(
  pet: Pet,
  records: MedicalRecord[],
  weights: WeightEntry[],
  documents: PetDocument[],
): Promise<void> {
  const logo = await logoDataUri();
  const timeline = buildTimeline(pet, records, weights, documents);
  const html = buildLifelineHtml(pet, timeline, logo);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Linha da Vida de ${pet.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
