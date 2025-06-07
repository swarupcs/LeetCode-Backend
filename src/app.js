import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import problemRoutes from './routes/problem.route.js';
import submissionRoutes from './routes/submission.routes.js';
import cors from 'cors';
import runCode from './routes/runCode.routes.js';
import sheetsRoutes from './routes/sheets.routes.js';
import userStatsRoutes from './routes/userStats.routes.js';
import discussionsRoutes from './routes/discussions.routes.js';

dotenv.config();

const app = express();

dotenv.config();

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
  origin.trim()
);

console.log('allowedOrigins', allowedOrigins);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
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

app.use("/api/v1/userStats", userStatsRoutes)
app.use('/api/v1/discussions', discussionsRoutes);

app.use('/ping', (req, res) => {
  res.status(200).json({ message: 'pong' });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
