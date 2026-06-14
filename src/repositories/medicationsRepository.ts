import { getMedicationDoses, saveMedicationDose, deleteMedicationDose } from '../storage';

export const medicationsRepository = {
  getDoses: getMedicationDoses,
  saveDose: saveMedicationDose,
  removeDose: deleteMedicationDose,
};
