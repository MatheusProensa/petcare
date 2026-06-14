import { getRecords, getAllRecords, saveRecord, deleteRecord } from '../storage';

export const recordsRepository = {
  getByPet: getRecords,
  getAll: getAllRecords,
  save: saveRecord,
  remove: deleteRecord,
};
