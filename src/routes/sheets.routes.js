import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  addProblemToSheet,
  createSheet,
  deleteSheet,
  getAllSheetDetails,
  getIndividualSheetDetails,
  removeProblemFromSheet,
} from '../controllers/playlist.controller.js';

const sheetsRoutes = express.Router();

sheetsRoutes.get('/', authMiddleware, getAllSheetDetails);

sheetsRoutes.get('/:sheetId', authMiddleware, getIndividualSheetDetails);

sheetsRoutes.post('/createSheet', authMiddleware, createSheet);

sheetsRoutes.post('/:sheetId/addProblem', authMiddleware, addProblemToSheet);

sheetsRoutes.delete('/:sheetId', authMiddleware, deleteSheet);

sheetsRoutes.delete(
  '/:sheetId/removeProblem',
  authMiddleware,
  removeProblemFromSheet
);

export default sheetsRoutes;
