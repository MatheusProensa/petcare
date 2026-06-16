import { pushToCloud, pullFromCloud } from './firebase';
import { exportBackup, importBackup } from '../storage';

let lastSyncAt = 0;
const THROTTLE_MS = 5000;

export async function syncUp(uid: string): Promise<void> {
  const now = Date.now();
  if (now - lastSyncAt < THROTTLE_MS) return;
  lastSyncAt = now;
  const json = await exportBackup();
  const data = JSON.parse(json);
  await pushToCloud(uid, { backup: data, syncedAt: new Date().toISOString() });
}

export async function syncDown(uid: string): Promise<boolean> {
  const cloud = await pullFromCloud(uid) as any;
  if (!cloud?.backup) return false;
  await importBackup(JSON.stringify(cloud.backup));
  return true;
}
