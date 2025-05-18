import express from "express";
import { check, getUserDetails, login, logout, register } from "../controllers/auth.controller.js";
import { authMiddleware } from './../middleware/auth.middleware.js';

const authRoutes = express.Router();

authRoutes.post("/register", register);

authRoutes.post("/login", login);

authRoutes.post("/logout", authMiddleware, logout);

authRoutes.get("/getUserDetails", authMiddleware, getUserDetails)

authRoutes.get("/check", authMiddleware, check);

export default authRoutes;