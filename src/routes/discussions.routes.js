import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createDiscussion, getAllDiscussions } from '../controllers/discussions.controller.js';


const discussionsRoutes = express.Router();


discussionsRoutes.post('/createDiscussion', authMiddleware, createDiscussion);
discussionsRoutes.get('/getAllDiscussions', getAllDiscussions);


export default discussionsRoutes;