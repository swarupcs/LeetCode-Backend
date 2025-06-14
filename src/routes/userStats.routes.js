import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getUserHeatMapData, getUserProgressData, getUserSolvedStats } from '../controllers/userStats.controller.js';

const userStatsRoutes = express.Router();


userStatsRoutes.get('/getUserHeatMapData', authMiddleware, getUserHeatMapData);
userStatsRoutes.get('/getUserProgress', authMiddleware, getUserProgressData);
userStatsRoutes.get('/getUserSolvedStats', authMiddleware, getUserSolvedStats);



export default userStatsRoutes;





