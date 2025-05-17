import { db } from '../libs/db.js';
import {
  getLanguageName,
  pollBatchResults,
  submitBatch,
} from '../libs/judge0.lib.js';

export const runProblem = async (req, res) => {
  try {
    const { source_code, language_id, problemId } = req.body;

    if (!source_code || !language_id || !problemId) {
      return res.status(400).json({
        error: 'source_code, language_id and problemId are required',
      });
    }

    // 1. Fetch public test cases from DB
    const publicTestCases = await db.testCase.findMany({
      where: {
        problemId,
        isPublic: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (!publicTestCases.length) {
      return res.status(404).json({
        error: 'No public test cases found for this problem.',
      });
    }

    // 2. Prepare submissions for Judge0
    const submissions = publicTestCases.map(({ input }) => ({
      source_code,
      language_id,
      stdin: input,
    }));

    // 3. Submit to Judge0
    const submitResponse = await submitBatch(submissions);
    const tokens = submitResponse.map((r) => r.token);

    // 4. Poll for results
    const results = await pollBatchResults(tokens);

    // 5. Analyze results
    let allPassed = true;
    const detailedResults = results.map((result, i) => {
      const stdout = result.stdout?.trim() ?? '';
      const expected_output = publicTestCases[i].expected.trim();
      const passed = stdout === expected_output;
      if (!passed) allPassed = false;

      return {
        testCase: i + 1,
        passed,
        stdout,
        expected: expected_output,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        status: result.status.description,
        memory: result.memory ? `${result.memory} KB` : undefined,
        time: result.time ? `${result.time} s` : undefined,
      };
    });

    // 6. Return result (no DB save)
    return res.status(200).json({
      success: true,
      message: 'Code executed successfully on public test cases.',
      allPassed,
      results: detailedResults,
    });
  } catch (error) {
    console.error('Error executing code:', error);
    return res.status(500).json({ error: 'Failed to execute code' });
  }
};



export const submitProblem = async (req, res) => {
  try {
    const { source_code, language_id, problemId } = req.body;
    const userId = req.user.id;

    // 1. Validate inputs
    if (!source_code || !language_id || !problemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Get public + private test cases from DB
    const testCases = await db.testCase.findMany({
      where: { problemId },
      orderBy: { isPublic: 'desc' }, // Optional: show public first
    });

    if (!testCases || testCases.length === 0) {
      return res
        .status(404)
        .json({ error: 'No test cases found for this problem' });
    }

    const stdin = testCases.map((tc) => tc.input);
    const expected_outputs = testCases.map((tc) => tc.expectedOutput);

    // 3. Prepare batch submission
    const submissions = stdin.map((input) => ({
      source_code,
      language_id,
      stdin: input,
    }));

    // 4. Submit batch to Judge0
    const submitResponse = await submitBatch(submissions);
    const tokens = submitResponse.map((res) => res.token);

    // 5. Poll for all results
    const results = await pollBatchResults(tokens);

    // 6. Analyze results
    let allPassed = true;
    const detailedResults = results.map((result, i) => {
      const stdout = result.stdout?.trim();
      const expected = expected_outputs[i]?.trim();
      const passed = stdout === expected;

      if (!passed) allPassed = false;

      return {
        testCaseId: testCases[i].id,
        testCase: i + 1,
        passed,
        stdout,
        expected,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        status: result.status.description,
        memory: result.memory ? `${result.memory} KB` : undefined,
        time: result.time ? `${result.time} s` : undefined,
      };
    });

    // 7. Save the submission summary
    const submission = await db.submission.create({
      data: {
        userId,
        problemId,
        sourceCode: source_code,
        language: getLanguageName(language_id),
        stdin: stdin.join('\n'),
        stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
        stderr: detailedResults.some((r) => r.stderr)
          ? JSON.stringify(detailedResults.map((r) => r.stderr))
          : null,
        compileOutput: detailedResults.some((r) => r.compile_output)
          ? JSON.stringify(detailedResults.map((r) => r.compile_output))
          : null,
        status: allPassed ? 'Accepted' : 'Wrong Answer',
        memory: JSON.stringify(detailedResults.map((r) => r.memory)),
        time: JSON.stringify(detailedResults.map((r) => r.time)),
      },
    });

    // 8. Save individual test case results
    const testCaseResults = detailedResults.map((result) => ({
      submissionId: submission.id,
      testCaseId: result.testCaseId,
      passed: result.passed,
      stdout: result.stdout,
      expected: result.expected,
      stderr: result.stderr,
      compileOutput: result.compile_output,
      status: result.status,
      memory: result.memory,
      time: result.time,
    }));

    await db.testCaseResult.createMany({ data: testCaseResults });

    // 9. If all test cases passed, mark problem as solved
    if (allPassed) {
      await db.problemSolved.upsert({
        where: {
          userId_problemId: { userId, problemId },
        },
        update: {},
        create: { userId, problemId },
      });
    }

    // 10. Return the result
    const submissionWithTestCases = await db.submission.findUnique({
      where: { id: submission.id },
      include: { testCases: true },
    });

    return res.status(200).json({
      success: true,
      message: allPassed ? 'All test cases passed!' : 'Some test cases failed.',
      submission: submissionWithTestCases,
    });
  } catch (error) {
    console.error('Error submitting problem:', error);
    return res.status(500).json({ error: 'Failed to submit problem' });
  }
};



