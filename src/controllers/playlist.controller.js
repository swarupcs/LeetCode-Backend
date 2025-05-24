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
    const sdeSheets = await db.Sheet.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Sheets fetched successfully',
      sdeSheets,
    });
  } catch (error) {
    console.error('Error fetching sheets:', error);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
};

export const getIndividualSheetDetails = async (req, res) => {
  const { sheetId } = req.params;

  console.log("sheetId", sheetId);
  try {
    const sdeSheets = await db.Sheet.findUnique({
      where: {
        id: sheetId,
        userId: req.user.id,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    if (!sdeSheets) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Sheet fetched successfully',
      sdeSheets,
    });
  } catch (error) {
    console.error('Error fetching sheets:', error);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
};

export const addProblemToSheet = async (req, res) => {
  const { sheetId } = req.params;
  const { problemIds } = req.body;

  console.log("sheetId", sheetId);
  console.log("problemIds", problemIds);

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

    

    console.log("problemsInSheet", problemsInSheet);

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

  console.log("sheetId", sheetId);
  console.log("problemIds", problemIds);

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
