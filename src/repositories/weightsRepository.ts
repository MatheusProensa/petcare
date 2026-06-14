import { getWeights, saveWeight, deleteWeight } from '../storage';

export const weightsRepository = {
  getByPet: getWeights,
  save: saveWeight,
  remove: deleteWeight,
};
