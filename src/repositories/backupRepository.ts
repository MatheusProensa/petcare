import {
  exportBackup,
  importBackup,
  peekBackupSummary,
  getLastBackupDate,
  loadDemoData,
} from '../storage';

export const backupRepository = {
  export: exportBackup,
  import: importBackup,
  peekSummary: peekBackupSummary,
  getLastBackupDate,
  loadDemoData,
};
