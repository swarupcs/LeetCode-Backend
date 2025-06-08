import { db } from '../libs/db.js';

import { format } from 'date-fns'; // Use to format date
import { formatMemory } from '../libs/formatMemory.js';

export const getUserSubmissions = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Fetch all submissions by user
    const submissions = await db.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        problemId: true,
        status: true,
        language: true,
        createdAt: true,
        problem: {
          select: {
            title: true,
            difficulty: true,
            tags: true,
          },
        },
        testCases: {
          select: {
            time: true,
            memory: true,
          },
        },
      },
    });

    // 2. Fetch total number of problems in platform
    const totalProblems = await db.problem.count();

    // console.log("submissions", submissions);
    if (!submissions.length) {
      return res.status(200).json({
        message: 'No submissions found',
        submissions: [],
        stats: {
          totalProblemsAvailable: totalProblems,
          solvedProblemCount: 0,
        },
      });
    }

    console.log('submissions', submissions);

    // 3. Fetch number of problems solved by this user
    const solvedProblems = await db.problemSolved.findMany({
      where: { userId },
      select: { problemId: true },
      distinct: ['problemId'],
    });

    const solvedProblemCount = solvedProblems.length;

    const formatted = submissions.map((s) => {
      const totalTime = s.testCases.reduce(
        (acc, tc) => acc + (parseFloat(tc.time) || 0),
        0
      );
      const totalMemory = s.testCases.reduce(
        (acc, tc) => acc + (parseFloat(tc.memory) || 0),
        0
      );

      console.log("totalMemory", totalMemory);

      return {
        id: s.id,
        problemName: s.problem.title,
        problemId: s.problemId,
        problemDifficulty: s.problem.difficulty,
        tags: s.problem.tags,
        status: s.status,
        language: s.language,
        runtime: `${totalTime.toFixed(2)}ms`,
        memory: formatMemory(totalMemory),
        date: format(new Date(s.createdAt), 'MMM d, yyyy'),
      };
    });

    console.log("formatted", formatted);

    res.status(200).json({
      success: true,
      message: 'Submissions fetched',
      submissions: formatted,
      stats: {
        totalProblemsAvailable:totalProblems,
        solvedProblemCount,
      },
    });
  } catch (err) {
    console.error('Failed to fetch submissions:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const getUserSubmissionsForProblem = async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.problemId; // assuming problemId comes as a URL param

  const convertToKB = (memStr) => {
    if (typeof memStr === 'number') return memStr;
    const regex = /([\d.]+)\s*(KB|MB|GB)?/i;
    const match = memStr.match(regex);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2] ? match[2].toUpperCase() : 'KB';
    switch (unit) {
      case 'MB':
        return value * 1024;
      case 'GB':
        return value * 1024 * 1024;
      default:
        return value;
    }
  };

  try {
    const submissions = await db.submission.findMany({
      where: {
        userId,
        problemId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        problemId: true,
        status: true,
        language: true,
        createdAt: true,
        problem: {
          select: {
            title: true,
          },
        },
        testCases: {
          select: {
            time: true,
            memory: true,
          },
        },
      },
    });



    if (!submissions.length) {
      return res
        .status(200)
        .json({ message: 'No submissions found', total: 0, submissions: [] });
    }

    const formatted = submissions.map((s) => {
      const totalTime = s.testCases.reduce(
        (acc, tc) => acc + (parseFloat(tc.time) || 0),
        0
      );

      const testMemory = s.testCases.map((tc) => tc.memory || 0);
      // console.log("testMemory", testMemory);

      const totalMemoryKB = s.testCases.reduce(
        (acc, tc) => acc + convertToKB(tc.memory || '0 KB'),
        0
      );


      return {
        id: s.id,
        status: s.status,
        language: s.language,
        runtime: `${totalTime.toFixed(2)}ms`,
        memory: formatMemory(totalMemoryKB),
        date: format(new Date(s.createdAt), 'MMM d, yyyy'),
      };
    });

    // console.log("formatted", formatted);

    res.status(200).json({
      problemId,
      problemTitle: submissions[0].problem.title,
      total: submissions.length,
      submissions: formatted,
    });
  } catch (err) {
    console.error('Failed to fetch submissions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// export const getAllSubmission = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const submissions = await db.submission.findMany({
//       where: {
//         userId: userId,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: 'Submissions fetched successfully',
//       submissions,
//     });
//   } catch (error) {
//     console.error('Fetch Submissions Error:', error);
//     res.status(500).json({ error: 'Failed to fetch submissions' });
//   }
// };

// export const getSubmissionsForProblem = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const problemId = req.params.problemId;
//     const submissions = await db.submission.findMany({
//       where: {
//         userId: userId,
//         problemId: problemId,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: 'Submission fetched successfully',
//       submissions,
//     });
//   } catch (error) {
//     console.error('Fetch Submissions Error:', error);
//     res.status(500).json({ error: 'Failed to fetch submissions' });
//   }
// };

// export const getAllTheSubmissionsForProblem = async (req, res) => {
//   try {
//     const problemId = req.params.problemId;
//     const submission = await db.submission.count({
//       where: {
//         problemId: problemId,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: 'Submissions Fetched successfully',
//       count: submission,
//     });
//   } catch (error) {
//     console.error('Fetch Submissions Error:', error);
//     res.status(500).json({ error: 'Failed to fetch submissions' });
//   }
// };
