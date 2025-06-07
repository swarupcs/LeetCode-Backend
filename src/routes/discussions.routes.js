import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  createDiscussion,
  deleteComment,
  deleteDiscussion,
  getAllDiscussions,
  updateComment,
  updateDiscussion,
} from '../controllers/discussions.controller.js';

const discussionsRoutes = express.Router();

discussionsRoutes.post('/createDiscussion', authMiddleware, createDiscussion);
discussionsRoutes.get('/getAllDiscussions', getAllDiscussions);
discussionsRoutes.put(
  '/updateDiscussion/:id',
  authMiddleware,
  updateDiscussion
);
discussionsRoutes.delete(
  '/deleteDiscussion/:id',
  authMiddleware,
  deleteDiscussion
);
discussionsRoutes.put('/comments/:id', authMiddleware, updateComment);
discussionsRoutes.delete('/comments/:id', authMiddleware, deleteComment);

export default discussionsRoutes;
