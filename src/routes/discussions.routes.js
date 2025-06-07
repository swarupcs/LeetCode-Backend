import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createDiscussion, deleteComment, getAllDiscussions, updateComment } from '../controllers/discussions.controller.js';


const discussionsRoutes = express.Router();


discussionsRoutes.post('/createDiscussion', authMiddleware, createDiscussion);
discussionsRoutes.get('/getAllDiscussions', getAllDiscussions);
discussionsRoutes.put('/comments/:id', authMiddleware, updateComment);
discussionsRoutes.delete('/comments/:id', authMiddleware, deleteComment);





export default discussionsRoutes;