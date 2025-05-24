import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  addProblemToSheet,
  createSheet,
  deletePlaylist,
  getAllSheetDetails,
  getIndividualSheetDetails,
  removeProblemFromPlaylist,
} from '../controllers/playlist.controller.js';

const sheetsRoutes = express.Router();

sheetsRoutes.get('/', authMiddleware, getAllSheetDetails);

sheetsRoutes.get('/:sheetId', authMiddleware, getIndividualSheetDetails);

sheetsRoutes.post('/createSheet', authMiddleware, createSheet);

sheetsRoutes.post('/:sheetId/addProblem', authMiddleware, addProblemToSheet);

sheetsRoutes.delete('/:sheetId', authMiddleware, deletePlaylist);

sheetsRoutes.delete(
  '/:sheetId/removeProblem',
  authMiddleware,
  removeProblemFromPlaylist
);

export default sheetsRoutes;
