import { db } from '../libs/db.js';

export const getLeaderboardData = async (req, res) => {
  try {
    // Step 1: Get all accepted submissions
    const acceptedSubmissions = await db.submission.findMany({
      where: {
        status: 'Accepted',
      },
      select: {
        userId: true,
        problemId: true,
      },
    });

    console.log("acceptedSubmissions", acceptedSubmissions);

    // Step 2: Create a map to store unique problemIds per user
    const userSolvedMap = new Map();

    for (const { userId, problemId } of acceptedSubmissions) {
      if (!userSolvedMap.has(userId)) {
        userSolvedMap.set(userId, new Set());
      }
      userSolvedMap.get(userId).add(problemId);
    }

    // Step 3: Prepare leaderboard data
    const leaderboardData = Array.from(userSolvedMap.entries()).map(
      ([userId, problemSet]) => ({
        userId,
        problemsSolved: problemSet.size,
      })
    );

    // Step 4: Sort by problems solved descending
    leaderboardData.sort((a, b) => b.problemsSolved - a.problemsSolved);

    // Step 5: Fetch user details
    const userIds = leaderboardData.map((entry) => entry.userId);
    const users = await db.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });

    const userMap = {};
    users.forEach((user) => {
      userMap[user.id] = {
        username: user.username || user.email,
        fullName: user.name || '',
      };
    });

    const leaderboard = leaderboardData.map((entry, index) => ({
      rank: index + 1,
      username: userMap[entry.userId]?.username || 'Unknown',
      fullName: userMap[entry.userId]?.fullName || 'N/A',
      problemsSolved: entry.problemsSolved,
    }));

    res.status(200).json({
      success: true,
      message: 'Leaderboard fetched successfully',
      data: leaderboard,
    });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
