import { db } from '../libs/db.js';
import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from '../libs/judge0.lib.js';

/*
  1. It extracts problem details from the request body.
  2. It iterates through reference solutions for each language and:
    a. Checks if the language is supported.
    b. Submits test cases to a judging system (Judge0) and retrieves results.
    c. Checks if all test cases pass for each language. If any fail, it returns an error.
  3. If all test cases pass, it creates a new problem in the database using Prisma.
  4. It returns a success response with the newly created problem.
  In essence, this endpoint validates problem submissions by running test cases against reference solutions
   in different languages before creating a new problem in the database.
*/

export const createProblem = async (req, res) => {
  const { problemNumber, problem, testCases } = req.body;

  if (!problem) {
    return res.status(400).json({
      success: false,
      message: 'Problem data is required in the request body.',
    });
  }

  const {
    title,
    description,
    difficulty,
    tags = [],
    examples = [],
    constraints = '',
    codeSnippets = {},
    referenceSolutions = {},
    hints = '',
    editorial = '',
    companyTags = [],
  } = problem;

  if (!title || !description || !difficulty) {
    return res.status(400).json({
      success: false,
      message: 'Title, description, and difficulty are required.',
    });
  }

  try {
    // Check for existing title or problemNumber
    const existingProblem = await db.problem.findFirst({
      where: {
        OR: [{ title }, ...(problemNumber ? [{ problemNumber }] : [])],
      },
    });

    if (existingProblem) {
      return res.status(409).json({
        success: false,
        message: 'Problem with this title or number already exists.',
      });
    }

    // Validate reference solutions using Judge0
    for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
      const languageId = getJudge0LanguageId(language);

      if (!languageId) {
        return res.status(400).json({
          success: false,
          message: `Language ${language} is not supported`,
        });
      }

      const submissions = testCases.map(({ input, expected }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: expected,
      }));

      const submissionResults = await submitBatch(submissions);
      const tokens = submissionResults.map((res) => res.token);
      const results = await pollBatchResults(tokens);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status.id !== 3) {
          return res.status(400).json({
            success: false,
            message: `Reference solution failed on testcase #${
              i + 1
            } for language ${language}`,
            details: result,
          });
        }
      }
    }

    // Save the problem and test cases
    const newProblem = await db.$transaction(async (tx) => {
      const createdProblem = await tx.problem.create({
        data: {
          problemNumber,
          title,
          description,
          difficulty,
          tags,
          examples,
          constraints,
          codeSnippets,
          referenceSolutions,
          userId: req.user.id,
          hints,
          editorial,
        },
      });

      if (Array.isArray(testCases)) {
        await tx.testCase.createMany({
          data: testCases.map((tc) => ({
            input: tc.input,
            expected: tc.expected,
            isPublic: Boolean(tc.isPublic),
            problemId: createdProblem.id,
          })),
        });
      }

      return createdProblem;
    });

    return res.status(201).json({
      success: true,
      message: 'Problem created successfully',
      problem: newProblem,
    });
  } catch (error) {
    console.error('Create problem error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error while creating the problem',
    });
  }
};




export const getAllProblems = async (req, res) => {
  try {
    const userId = req.body?.userId || null;

    const problems = await db.problem.findMany({
      orderBy: {
        problemNumber: 'asc',
      },
      include: {
        solvedBy: {
          select: {
            userId: true,
          },
        },
        testCases: {
          where: {
            isPublic: true,
          },
          select: {
            input: true,
            expected: true,
          },
        },
      },
    });

    if (!problems || problems.length === 0) {
      return res.status(404).json({ error: 'Problems not found.' });
    }

    // console.log("problems", problems);

    const problemsWithSolvedFlag = problems.map((problem) => {

      console.log("problem.solvedBy", problem.solvedBy);
      console.log("userId", userId);
      const isSolved = userId
        ? problem.solvedBy.some((entry) => entry.userId === userId)
        : false;

      return {
        id: problem.id,
        isSolved,
        problemNumber: problem.problemNumber,
        tags: problem.tags,
        title: problem.title,
        updatedAt: problem.updatedAt,
        createdAt: problem.createdAt,
        userId: problem.userId,
        description: problem.description,
        difficulty: problem.difficulty,
      };
    });

    // console.log('problemsWithSolvedFlag', problemsWithSolvedFlag);

    return res.status(200).json({
      success: true,
      message: 'Problems fetched successfully',
      problems: problemsWithSolvedFlag,
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    return res.status(500).json({
      error: 'Error while fetching problems',
    });
  }
};




export const getProblemById = async (req, res) => {
  const { id } = req.params;

  try {
    const problem = await db.problem.findUnique({
      where: {
        id, // You can also support problemNumber: parseInt(id) if needed
      },
      include: {
        testCases: {
          where: {
            isPublic: true, // only show public test cases
          },
          select: {
            input: true,
            expected: true,
          },
        },
        // solvedBy: {
        //   where: {
        //     userId: req.user.id,
        //   },
        //   select: {
        //     id: true,
        //   },
        // },
      },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Fetched problem successfully',
      problem: {
        ...problem,
        // isSolved: problem.solvedBy.length > 0,
      },
    });
  } catch (error) {
    console.error('Error fetching problem by ID:', error);
    return res.status(500).json({
      error: 'Error while fetching problem by ID',
    });
  }
};


export const updateProblem = async (req, res) => {
  const { problemId } = req.params; // from URL like /problems/update-problem/:problemId
  const { problemNumber, problem, testCases } = req.body;

  if (!problemId) {
    return res.status(400).json({
      success: false,
      message: 'Problem ID is required in URL params.',
    });
  }

  try {
    // Find existing problem by id (UUID or string id)
    const existingProblem = await db.problem.findUnique({
      where: { id: problemId },
    });

    if (!existingProblem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found.',
      });
    }

    // Prepare update data object
    const updateData = {};

    if (problem) {
      // Spread problem fields (title, description, difficulty, tags, etc.)
      updateData.title = problem.title ?? existingProblem.title;
      updateData.description =
        problem.description ?? existingProblem.description;
      updateData.difficulty = problem.difficulty ?? existingProblem.difficulty;
      updateData.tags = problem.tags ?? existingProblem.tags;
      updateData.examples = problem.examples ?? existingProblem.examples;
      updateData.constraints =
        problem.constraints ?? existingProblem.constraints;
      updateData.codeSnippets =
        problem.codeSnippets ?? existingProblem.codeSnippets;
      updateData.referenceSolutions =
        problem.referenceSolutions ?? existingProblem.referenceSolutions;
    }

    // If problemNumber is present in request body, update it
    if (problemNumber !== undefined) {
      updateData.problemNumber = problemNumber;
    }

    // Update the problem record
    const updatedProblem = await db.problem.update({
      where: { id: problemId },
      data: updateData,
    });

    // TODO: Update testCases if you have testCases logic and relations
    // This part depends on your schema and may need deletes/inserts or updateMany

    return res.json({
      success: true,
      message: 'Problem updated successfully',
      data: updatedProblem,
    });
  } catch (error) {
    console.error('Update problem error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error while updating the problem',
    });
  }
};





export const deleteProblem = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the problem exists
    const problem = await db.problem.findUnique({
      where: { id },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Delete the problem (related entries will be removed via onDelete: Cascade)
    await db.problem.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Problem deleted successfully',
    });
  } catch (error) {
    console.error('Error while deleting problem:', error);
    return res.status(500).json({
      error: 'An error occurred while deleting the problem',
    });
  }
};


export const getAllProblemsSolvedByUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID missing in request',
      });
    }

    // Fetch problems solved by the user
    const problems = await db.problem.findMany({
      where: {
        solvedBy: {
          some: { userId },
        },
      },
      // Include solvedBy relation filtered to current user if you want details
      include: {
        solvedBy: {
          where: { userId },
          select: { createdAt: true }, // example: select only date solved, adjust as needed
        },
      },
      orderBy: { updatedAt: 'desc' }, // optional: latest updated first
      // skip: 0, // optional pagination
      // take: 20,
    });

    if (!problems.length) {
      return res.status(200).json({
        success: true,
        message: 'You have not solved any problems yet.',
        problems: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Problems fetched successfully',
      problems,
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch problems',
    });
  }
};

