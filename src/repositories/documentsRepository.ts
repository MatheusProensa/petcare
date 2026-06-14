import { getDocuments, saveDocument, deleteDocument } from '../storage';

export const documentsRepository = {
  getByPet: getDocuments,
  save: saveDocument,
  remove: deleteDocument,
};
