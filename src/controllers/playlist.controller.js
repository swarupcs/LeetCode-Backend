import { db } from '../libs/db.js';

export const createSheet = async (req, res) => {
  try {
    const { name, description } = req.body;

    const userId = req.user.id;

    const sdeSheet = await db.Sheet.create({
      data: {
        name,
        description,
        userId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Problem Sheet created successfully',
      sdeSheet,
    });
  } catch (error) {
    console.error('Error creating Problem Sheet:', error);
    res.status(500).json({ error: 'Failed to create Problem Sheet' });
  }
};

export const getAllSheetDetails = async (req, res) => {
  try {
    // Fetch all sheets with user and problem details
    const sdeSheets = await db.Sheet.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                problemNumber: true,
                difficulty: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    // Post-process to add extra fields
    const processedSheets = sdeSheets.map((sheet) => {
      const totalProblems = sheet.problems.length;

      // Flatten all tags and remove duplicates
      const allTags = Array.from(
        new Set(sheet.problems.flatMap((p) => p.problem.tags || []))
      );

      // Get unique difficulties
      const allDifficulties = Array.from(
        new Set(sheet.problems.map((p) => p.problem.difficulty))
      );

      return {
        ...sheet,
        totalProblems,
        allTags,
        allDifficulties,
      };
    });

    res.status(200).json({
      success: true,
      message: 'All sheets fetched successfully',
      sdeSheets: processedSheets,
    });
  } catch (error) {
    console.error('Error fetching sheets:', error);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
};

export const getIndividualSheetDetails = async (req, res) => {
  const { sheetId } = req.params;

  console.log('sheetId', sheetId);
  try {
    const sheet = await db.Sheet.findFirst({
      where: {
        id: sheetId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                problemNumber: true,
                difficulty: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    if (!sheet) {
      console.log('sheet', sheet);
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const totalProblems = sheet.problems.length;

    const allTags = Array.from(
      new Set(sheet.problems.flatMap((p) => p.problem.tags || []))
    );

    const allDifficulties = Array.from(
      new Set(sheet.problems.map((p) => p.problem.difficulty))
    );

    // Combine processed data
    const processedSheet = {
      ...sheet,
      totalProblems,
      allTags,
      allDifficulties,
    };

    res.status(200).json({
      success: true,
      message: 'Sheet fetched successfully',
      sdeSheet: processedSheet,
    });
  } catch (error) {
    console.error('Error fetching sheet:', error);
    res.status(500).json({ error: 'Failed to fetch sheet' });
  }
};

export const addProblemToSheet = async (req, res) => {
  const { sheetId } = req.params;
  const { problemIds } = req.body;

  console.log('sheetId', sheetId);
  console.log('problemIds', problemIds);

  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing problemsId' });
    }

    // Create records fro each problems in the playlist
    const problemsInSheet = await db.ProblemInSheet.createMany({
      data: problemIds.map((problemId) => ({
        sheetId,
        problemId,
      })),
    });

    console.log('problemsInSheet', problemsInSheet);

    res.status(201).json({
      success: true,
      message: 'Problems added to Sheet successfully',
      problemsInSheet,
    });
  } catch (error) {
    console.error('Error Adding problem in  Sheet:', error);
    res.status(500).json({ error: 'Failed to adding problem in Sheet' });
  }
};

export const deleteSheet = async (req, res) => {
  const { sheetId } = req.params;

  try {
    const deleteSheet = await db.Sheet.delete({
      where: {
        id: sheetId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Sheet deleted successfully',
      deleteSheet,
    });
  } catch (error) {
    console.error('Error deleting Sheet:', error.message);
    res.status(500).json({ error: 'Failed to delete Sheet' });
  }
};

export const removeProblemFromSheet = async (req, res) => {
  const { sheetId } = req.params;
  const { problemIds } = req.body;

  console.log('sheetId', sheetId);
  console.log('problemIds', problemIds);

  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing problemsId' });
    }

    const deletedProblem = await db.ProblemInSheet.deleteMany({
      where: {
        sheetId,
        problemId: {
          in: problemIds,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Problem removed from sheet successfully',
      deletedProblem,
    });
  } catch (error) {
    console.error('Error removing problem from sheet:', error.message);
    res.status(500).json({ error: 'Failed to remove problem from sheet' });
  }
};

export const updateProblemsInSheet = async (req, res) => {
  const { sheetId } = req.params;
  const { problemIds } = req.body;

  console.log('sheetId:', sheetId);
  console.log('problemIds:', problemIds);

  try {
    if (!Array.isArray(problemIds)) {
      return res.status(400).json({ error: 'Invalid or missing problemsId' });
    }

    // Delete existing problems in the sheet
    await db.ProblemInSheet.deleteMany({
      where: { sheetId },
    });

    // If the new problemIds array is empty, we’re done
    if (problemIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Sheet problems cleared successfully',
        problemsInSheet: [],
      });
    }

    // Insert the new set of problems
    const problemsInSheet = await db.ProblemInSheet.createMany({
      data: problemIds.map((problemId) => ({
        sheetId,
        problemId,
      })),
    });

    res.status(200).json({
      success: true,
      message: 'Sheet problems updated successfully',
      problemsInSheet,
    });
  } catch (error) {
    console.error('Error updating problems in sheet:', error.message);
    res.status(500).json({ error: 'Failed to update problems in sheet' });
  }
};
