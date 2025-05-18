import { db } from '../libs/db.js';

import { format } from 'date-fns'; // Use to format date


export const getUserSubmissions = async (req, res) => {
  const userId = req.user.id;

  try {
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

    // console.log("submissions", submissions);
    if (!submissions.length) {
      return res
        .status(200)
        .json({ message: 'No submissions found', submissions: [] });
    }
    // Extract problem info from the first submission (since all share same problem)
    const problemId = submissions[0].problemId;
    const problemTitle = submissions[0].problem.title;



 
const formatted = submissions.map((s) => {
  const totalTime = s.testCases.reduce(
    (acc, tc) => acc + (parseFloat(tc.time) || 0),
    0
  );
  const totalMemory = s.testCases.reduce(
    (acc, tc) => acc + (parseFloat(tc.memory) || 0),
    0
  );

  return {
    id: s.id,
    status: s.status,
    language: s.language,
    runtime: `${totalTime.toFixed(2)}ms`,
    memory: `${totalMemory.toFixed(2)}MB`,
    date: format(new Date(s.createdAt), 'MMM d, yyyy'),
  };
});

    res.status(200).json({ problemId, problemTitle, submissions: formatted });
  } catch (err) {
    console.error('Failed to fetch submissions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getUserSubmissionsForProblem = async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.problemId; // assuming problemId comes as a URL param

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
      const totalMemory = s.testCases.reduce(
        (acc, tc) => acc + (parseFloat(tc.memory) || 0),
        0
      );

      return {
        id: s.id,
        status: s.status,
        language: s.language,
        runtime: `${totalTime.toFixed(2)}ms`,
        memory: `${totalMemory.toFixed(2)}MB`,
        date: format(new Date(s.createdAt), 'MMM d, yyyy'),
      };
    });

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
