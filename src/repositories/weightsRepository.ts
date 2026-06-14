import { getWeights, getAllWeights, saveWeight, deleteWeight } from '../storage';

export const weightsRepository = {
  getByPet: getWeights,
  getAll: getAllWeights,
  save: saveWeight,
  remove: deleteWeight,
};
