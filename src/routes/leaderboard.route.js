import express from 'express';
import { getLeaderboardData } from '../controllers/leaderboard.controller.js';


const leaderboardRoutes = express.Router();

leaderboardRoutes.get('/getLeaderboard', getLeaderboardData);



export default leaderboardRoutes;
