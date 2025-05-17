import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { runProblem, submitProblem } from "../controllers/runProblem.controller.js";

const runCode = express.Router();

runCode.post("/runCode", authMiddleware, runProblem);
runCode.post("/submitCode", authMiddleware, submitProblem);

export default runCode;
