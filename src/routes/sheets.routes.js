import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  addProblemToSheet,
  createSheet,
  deleteSheet,
  getAllSheetDetails,
  getIndividualSheetDetails,
  removeProblemFromSheet,
  updateProblemsInSheet,
} from '../controllers/playlist.controller.js';

const sheetsRoutes = express.Router();

sheetsRoutes.get('/',  getAllSheetDetails);

sheetsRoutes.get('/:sheetId',  getIndividualSheetDetails);

sheetsRoutes.post('/createSheet', authMiddleware, createSheet);

sheetsRoutes.post('/:sheetId/addProblem', authMiddleware, addProblemToSheet);

sheetsRoutes.delete('/:sheetId', authMiddleware, deleteSheet);

sheetsRoutes.delete(
  '/:sheetId/removeProblem',
  authMiddleware,
  removeProblemFromSheet
);

sheetsRoutes.post(
  '/:sheetId/updateProblems',
  authMiddleware,
  updateProblemsInSheet
);

export default sheetsRoutes;
