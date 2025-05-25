import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import problemRoutes from './routes/problem.route.js';
import submissionRoutes from './routes/submission.routes.js';
import cors from 'cors';
import runCode from './routes/runCode.routes.js';
import sheetsRoutes from './routes/sheets.routes.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Welcome to the leetlab-API!');
});

app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/problems', problemRoutes);

app.use('/api/v1/codeExecutor', runCode);
app.use('/api/v1/submission', submissionRoutes);
app.use('/api/v1/sheets', sheetsRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;