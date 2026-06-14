import { getPets, savePet, deletePet } from '../storage';

export const petsRepository = {
  getAll: getPets,
  save: savePet,
  remove: deletePet,
};
