import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { runProblem } from "../controllers/runProblem.controller.js";

const runCode = express.Router();

runCode.post("/", authMiddleware, runProblem);

export default runCode;
