import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { runProblem } from "../controllers/runProblem.controller.js";

const runCode = express.Router();

runCode.post("/runCode", authMiddleware, runProblem);
runCode.post("/submitCode", authMiddleware, runProblem);

export default runCode;
