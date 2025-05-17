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
  const { problem, testCases } = req.body;

  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    codeSnippets,
    referenceSolutions,
    hints,
    editorial,
    problemNumber,
  } = problem;

  if (!title || !description || !difficulty) {
    return res.status(400).json({
      success: false,
      message: 'Title, description, and difficulty are required.',
    });
  }

  try {
    // Check for duplicate title or problem number (if provided)
    const existingProblem = await db.problem.findFirst({
      where: {
        OR: [{ title }, problemNumber ? { problemNumber } : undefined].filter(
          Boolean
        ),
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
        return res
          .status(400)
          .json({ error: `Language ${language} is not supported` });
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
            error: `Reference solution failed on testcase ${
              i + 1
            } for language ${language}`,
          });
        }
      }
    }

    // Use a transaction to ensure atomicity
    const newProblem = await db.$transaction(async (tx) => {
      const createdProblem = await tx.problem.create({
        data: {
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
          problemNumber,
        },
      });

      if (Array.isArray(testCases)) {
        await tx.testCase.createMany({
          data: testCases.map((tc) => ({
            input: tc.input,
            expected: tc.expected,
            isPublic: !!tc.isPublic,
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
    const problems = await db.problem.findMany({
      orderBy: {
        problemNumber: 'asc', // Optional: shows in order of problemNumber if available
      },
      include: {
        solvedBy: {
          where: {
            userId: req.user.id,
          },
          select: {
            id: true, // You can customize what fields you want from ProblemSolved
          },
        },
        testCases: {
          where: {
            isPublic: true, // Optionally include only public test cases
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

    return res.status(200).json({
      success: true,
      message: 'Problems fetched successfully',
      problems,
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
        solvedBy: {
          where: {
            userId: req.user.id,
          },
          select: {
            id: true,
          },
        },
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
        isSolved: problem.solvedBy.length > 0,
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
  const { id } = req.params;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({ error: 'Invalid or missing problem ID.' });
  }

  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    codeSnippets,
    referenceSolutions,
    hints,
    editorial,
    problemNumber,
    testcases, // array of { input, expected, isPublic }
  } = req.body;

  // Validate required fields
  if (!title || !description || !difficulty) {
    console.log('title', title);
    console.log('description', description);
    console.log('difficulty', difficulty);
    return res.status(400).json({
      error: 'Missing required fields: title, description, and difficulty.',
    });
  }

  if (tags && !Array.isArray(tags)) {
    return res.status(400).json({ error: 'Tags must be an array of strings.' });
  }

  if (examples && typeof examples !== 'object') {
    return res
      .status(400)
      .json({ error: 'Examples must be a language-keyed object.' });
  }

  if (testcases && !Array.isArray(testcases)) {
    return res
      .status(400)
      .json({ error: 'Testcases must be an array of objects.' });
  }

  try {
    const existingProblem = await db.problem.findUnique({ where: { id } });
    if (!existingProblem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    // Update problem and testcases in a transaction
    const updatedProblem = await db.$transaction(async (tx) => {
      // Update main problem
      const updated = await tx.problem.update({
        where: { id },
        data: {
          title,
          description,
          difficulty,
          tags,
          examples,
          constraints,
          codeSnippets,
          referenceSolutions,
          hints,
          editorial,
          problemNumber,
        },
      });

      // If testcases are provided, delete old ones and create new ones
      if (Array.isArray(testcases)) {
        await tx.testCase.deleteMany({ where: { problemId: id } });

        const formattedTestCases = testcases.map((t) => ({
          input: t.input,
          expected: t.expected,
          isPublic: !!t.isPublic,
          problemId: id,
        }));

        await tx.testCase.createMany({ data: formattedTestCases });
      }

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: 'Problem updated successfully.',
      updatedProblem,
    });
  } catch (error) {
    console.error('Error updating problem:', error);
    return res.status(500).json({
      error: 'An internal server error occurred while updating the problem.',
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
    const problems = await db.problem.findMany({
      where: {
        solvedBy: {
          some: {
            userId: req.user.id,
          },
        },
      },
      include: {
        solvedBy: {
          where: {
            userId: req.user.id,
          },
        },
      },
    });

    if (!problems || problems.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'You have not solved any problems yet.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Problems fetched successfully',
      problems,
    });
  } catch (error) {
    console.error('Error fetching problems :', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
};
