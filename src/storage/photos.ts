import * as FileSystem from 'expo-file-system/legacy';

// Fotos escolhidas pelo image picker ficam no cache do app, que o sistema
// pode limpar a qualquer momento. Copiamos para o documentDirectory,
// que persiste enquanto o app estiver instalado.
const PHOTOS_DIR = `${FileSystem.documentDirectory}pet-photos/`;

function extensionOf(uri: string): string {
  const match = uri.match(/\.(\w+)(?:\?.*)?$/);
  return match ? match[1] : 'jpg';
}

export async function persistPhoto(tempUri: string, petId: string): Promise<string> {
  if (tempUri.startsWith(PHOTOS_DIR)) return tempUri;
  await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  const dest = `${PHOTOS_DIR}${petId}-${Date.now()}.${extensionOf(tempUri)}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export async function deletePhoto(uri?: string): Promise<void> {
  if (!uri || !uri.startsWith(PHOTOS_DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // arquivo órfão não impede a exclusão do pet
  }
}
