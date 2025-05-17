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
  } = problem;

  // Check for duplicate problem title
  const existingProblem = await db.problem.findFirst({
    where: { title },
  });

  if (existingProblem) {
    return res.status(409).json({
      success: false,
      message: 'Problem with this title already exists',
    });
  }

  try {
    // Validate reference solutions using Judge0 for each language
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
            error: `Testcase ${i + 1} failed for language ${language}`,
          });
        }
      }
    }

    // Create problem first
    const newProblem = await db.problem.create({
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
      },
    });

    // Create all test cases linked to the new problem
    await db.testCase.createMany({
      data: testCases.map((tc) => ({
        input: tc.input,
        expected: tc.expected,
        isPublic: tc.isPublic,
        problemId: newProblem.id,
      })),
    });

    return res.status(201).json({
      success: true,
      message: 'Problem created successfully',
      problem: newProblem,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error while creating the problem',
    });
  }
};


export const getAllProblems = async (req, res) => {
  try {
    const problems = await db.problem.findMany({
      include: {
        solvedBy: {
          where: {
            userId: req.user.id,
          },
          select: { id: true }, // Only to check existence
        },
      },
      orderBy: {
        problemNumber: 'asc', // Optional: sort by problem number
      },
    });

    if (!problems || problems.length === 0) {
      return res.status(404).json({ error: 'No problems found.' });
    }

    // Map to include isSolved field
    const formattedProblems = problems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      tags: problem.tags,
      problemNumber: problem.problemNumber,
      examples: problem.examples,
      constraints: problem.constraints,
      codeSnippets: problem.codeSnippets,
      referenceSolutions: problem.referenceSolutions,
      isSolved: problem.solvedBy.length > 0, // ✅ custom flag
    }));

    return res.status(200).json({
      success: true,
      message: 'Problems fetched successfully',
      problems: formattedProblems,
    });
  } catch (error) {
    console.error('Fetch problems error:', error);
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
        id,
      },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    return res.status(200).json({
      sucess: true,
      message: 'Fetched Problem Successfully',
      problem,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: 'Error While Fetching Problem by id',
    });
  }
};

export const updateProblem = async (req, res) => {
  const { id } = req.params;

  // Validate ID (assuming it's a string UUID or numeric string)
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
    testcases,
    codeSnippets,
    referenceSolutions,
  } = req.body;

  // Basic required field validation
  if (!title || !description || !difficulty) {
    return res.status(400).json({
      error:
        'Missing required fields: title, description, and difficulty are required.',
    });
  }

  // Validate types (optional but helpful)
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
    // Check if the problem exists
    const problem = await db.problem.findUnique({ where: { id } });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    // Perform the update
    const updatedProblem = await db.problem.update({
      where: { id },
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testcases,
        codeSnippets,
        referenceSolutions,
      },
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
    const problem = await db.problem.findUnique({ where: { id } });

    if (!problem) {
      return res.status(404).json({ error: 'Problem Not found' });
    }

    await db.problem.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Problem deleted Successfully',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: 'Error While deleting the problem',
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
