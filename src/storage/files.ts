import * as FileSystem from 'expo-file-system/legacy';

// Arquivos escolhidos por pickers ficam no cache do app, que o sistema
// pode limpar a qualquer momento. Copiamos para o documentDirectory,
// que persiste enquanto o app estiver instalado.
const PHOTOS_DIR = `${FileSystem.documentDirectory}pet-photos/`;
const DOCS_DIR = `${FileSystem.documentDirectory}pet-docs/`;

function extensionOf(uri: string): string {
  const match = uri.match(/\.(\w+)(?:\?.*)?$/);
  return match ? match[1] : 'jpg';
}

async function persistFile(tempUri: string, dir: string, baseName: string): Promise<string> {
  // Na web não há documentDirectory; os pickers já retornam um data URI estável.
  if (!FileSystem.documentDirectory) return tempUri;
  if (tempUri.startsWith(dir)) return tempUri;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${baseName}-${Date.now()}.${extensionOf(tempUri)}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

async function deleteFile(uri: string | undefined, dir: string): Promise<void> {
  if (!uri || !uri.startsWith(dir)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // arquivo órfão não impede a exclusão do item
  }
}

export function persistPhoto(tempUri: string, petId: string): Promise<string> {
  return persistFile(tempUri, PHOTOS_DIR, petId);
}

export function deletePhoto(uri?: string): Promise<void> {
  return deleteFile(uri, PHOTOS_DIR);
}

export function persistDocumentFile(tempUri: string, documentId: string): Promise<string> {
  return persistFile(tempUri, DOCS_DIR, documentId);
}

export function deleteDocumentFile(uri?: string): Promise<void> {
  return deleteFile(uri, DOCS_DIR);
}
