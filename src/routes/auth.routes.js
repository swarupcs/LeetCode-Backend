import express from "express";
import { check, getUserDetails, googleAuthCallback, login, logout, register } from "../controllers/auth.controller.js";
import { authMiddleware } from './../middleware/auth.middleware.js';
import passport from '../config/passport.js';
import session from 'express-session';


const authRoutes = express.Router();

// Session middleware for Google SSO
authRoutes.use(
    session({
      secret: process.env.SESSION_SECRET || 'default_secret',
      resave: false,
      saveUninitialized: false,
    })
  );
  authRoutes.use(passport.initialize());
  authRoutes.use(passport.session());

authRoutes.post("/register", register);

authRoutes.post("/login", login);

authRoutes.post("/logout", authMiddleware, logout);

authRoutes.get("/getUserDetails", authMiddleware, getUserDetails)

authRoutes.get("/check", authMiddleware, check);

// Google SSO routes
authRoutes.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

authRoutes.get('/google/callback', passport.authenticate('google', { session: false }), googleAuthCallback);

export default authRoutes;