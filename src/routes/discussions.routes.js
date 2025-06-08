import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  createDiscussion,
  deleteComment,
  deleteDiscussion,
  getAllComments,
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


discussionsRoutes.post('/createComment', authMiddleware, createDiscussion);
discussionsRoutes.get('/getAllComments/:discussionId', getAllComments);
discussionsRoutes.put('/updateComment/:id', authMiddleware, updateComment);
discussionsRoutes.delete('/deleteComment/:id', authMiddleware, deleteComment);

export default discussionsRoutes;
