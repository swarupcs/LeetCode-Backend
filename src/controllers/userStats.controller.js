import { db } from '../libs/db.js';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';


export const getUserHeatMapData = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get all submissions from the past 365 days
    const startDate = subDays(new Date(), 364);
    const submissions = await db.submission.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    if (!submissions.length) {
      return res.status(200).json({
        message: 'No submissions in the past year',
        heatmap: [],
      });
    }

    // Group submissions by date (YYYY-MM-DD)
    const countByDate = {};
    submissions.forEach((submission) => {
      const dateKey = format(new Date(submission.createdAt), 'yyyy-MM-dd');
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
    });

    // Build full heatmap data with 0s for missing days
    const today = new Date();
    const fullData = [];
    for (let i = 0; i < 365; i++) {
      const date = subDays(today, i);
      const formatted = format(date, 'yyyy-MM-dd');
      fullData.push({
        date: formatted,
        count: countByDate[formatted] || 0,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Heatmap data fetched successfully',
      heatmap: fullData.reverse(), // oldest to newest
    });
  } catch (err) {
    console.error('Failed to get heatmap data:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
};


export const getUserProgressData = async (req, res) => {
  const userId = req.user.id;

  try {
    const days = 365;
    const end = endOfDay(new Date()); // today till 23:59
    const start = startOfDay(subDays(new Date(), days - 1)); // start of day 364 days ago

    // Fetch Submission entries for the last 365 days
    const submissions = await db.submission.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Count submissions per date
    const submissionsByDate = {};
    submissions.forEach((item) => {
      const dateKey = format(item.createdAt, 'yyyy-MM-dd');
      submissionsByDate[dateKey] = (submissionsByDate[dateKey] || 0) + 1;
    });

    // Generate data: from today → back 364 days
    const allData = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(end, i); // i=0 means today, i=1 means yesterday
      const dateKey = format(date, 'yyyy-MM-dd');
      allData.push({
        date: dateKey,
        day: format(date, 'EEE'),
        problems: submissionsByDate[dateKey] || 0,
      });
    }

    // console.log("allData", allData);

    res.status(200).json({
      success: true,
      message: 'Yearly submission data fetched successfully',
      data: allData,
    });
  } catch (error) {
    console.error('Failed to get user progress data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};


export const getUserSolvedStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // Step 1: Get all unique problemIds the user has solved
    const solvedProblems = await db.problemSolved.findMany({
      where: { userId },
      select: { problemId: true },
      distinct: ['problemId'],
    });

    const solvedProblemIds = solvedProblems.map((item) => item.problemId);

    // Step 2: Fetch details of those solved problems
    const solvedProblemsDetails =
      solvedProblemIds.length > 0
        ? await db.problem.findMany({
            where: { id: { in: solvedProblemIds } },
            select: {
              difficulty: true,
              tags: true,
            },
          })
        : [];

    // Step 3: Aggregate user's solved stats
    const difficultyStats = { EASY: 0, MEDIUM: 0, HARD: 0 };
    const tagStats = {};

    for (const problem of solvedProblemsDetails) {
      difficultyStats[problem.difficulty] =
        (difficultyStats[problem.difficulty] || 0) + 1;

      for (const tag of problem.tags) {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      }
    }

    // Step 4: Get total problems count per difficulty
    const allProblems = await db.problem.findMany({
      select: {
        difficulty: true,
        tags: true,
      },
    });

    // Total counts per difficulty
    const totalDifficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };

    // Total counts per tag
    const totalTagCounts = {};

    for (const problem of allProblems) {
      totalDifficultyCounts[problem.difficulty] =
        (totalDifficultyCounts[problem.difficulty] || 0) + 1;

      for (const tag of problem.tags) {
        totalTagCounts[tag] = (totalTagCounts[tag] || 0) + 1;
      }
    }

    // Step 5: Send response
    res.status(200).json({
      success: true,
      message: 'Solved stats fetched successfully',
      data: {
        difficultyStats,
        tagStats,
        totalDifficultyCounts,
        totalTagCounts,
      },
    });
  } catch (err) {
    console.error('Failed to get user solved stats:', err);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

