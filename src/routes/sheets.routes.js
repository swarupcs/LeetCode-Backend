import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  addProblemToPlaylist,
  createPlaylist,
  deletePlaylist,
  getAllListDetails,
  getPlayListDetails,
  removeProblemFromPlaylist,
} from '../controllers/playlist.controller.js';

const sheetsRoutes = express.Router();

sheetsRoutes.get('/', authMiddleware, getAllListDetails);

sheetsRoutes.get('/:sheetId', authMiddleware, getPlayListDetails);

sheetsRoutes.post('/createSheet', authMiddleware, createPlaylist);

sheetsRoutes.post(
  '/:sheetId/addProblem',
  authMiddleware,
  addProblemToPlaylist
);

sheetsRoutes.delete('/:sheetId', authMiddleware, deletePlaylist);

sheetsRoutes.delete(
  '/:sheetId/removeProblem',
  authMiddleware,
  removeProblemFromPlaylist
);

export default sheetsRoutes;
