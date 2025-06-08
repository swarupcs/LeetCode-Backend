import { db } from '../libs/db.js';
import { formatMemory } from '../libs/formatMemory.js';
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

      // Format memory display


      return {
        testCase: i + 1,
        passed,
        stdout,
        expected: expected_output,
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        status: result.status.description,
        memory: result.memory ? formatMemory(result.memory) : undefined,
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
    const expected_outputs = testCases.map((tc) => tc.expected);

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
      const expected = expected_outputs[i]?.trim() || ''; // Ensure expected is never null/undefined
      const passed = stdout === expected;

      if (!passed) allPassed = false;

      return {
        testCaseId: testCases[i].id,
        testCase: i + 1,
        passed,
        stdout,
        expected: testCases[i].isPublic ? expected : undefined, // Only include expected for public test cases
        stderr: result.stderr || null,
        compile_output: result.compile_output || null,
        status: result.status.description,
        memory: result.memory ? formatMemory(result.memory) : undefined,
        time: result.time ? `${result.time} s` : undefined,
        isPublic: testCases[i].isPublic,
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
      testCase: result.testCase,
      passed: result.passed,
      stdout: result.stdout || '', // Ensure not null
      expected: result.expected || '', // Ensure never null/undefined
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

    // Calculate performance metrics - only total time and memory
    const times = detailedResults
      .map((r) => parseFloat(r.time?.replace(' s', '') || 0))
      .filter((t) => !isNaN(t));


      const memories = detailedResults
        .map((r) => {
          if (!r.memory) return 0;

          // Handle both "KB" and "MB" formats
          if (r.memory.includes('MB')) {
            const mb = parseFloat(r.memory.replace(' MB', ''));
            return mb * 1024; // Convert MB back to KB for calculation
          } else if (r.memory.includes('KB')) {
            return parseFloat(r.memory.replace(' KB', ''));
          }

          return 0;
        })
        .filter((m) => !isNaN(m) && m > 0);

    const performanceMetrics = {
      totalTime:
        times.length > 0
          ? `${times.reduce((a, b) => a + b, 0).toFixed(3)} s`
          : undefined,
      totalMemory:
        memories.length > 0
          ? formatMemory(memories.reduce((a, b) => a + b, 0))
          : undefined,
    };

    // 10. Return a sanitized response to the client
    const sanitizedResults = detailedResults.map((result) => {
      // Only include necessary fields and hide expected outputs for non-public test cases
      return {
        testCase: result.testCase,
        passed: result.passed,
        status: result.status,
        // Only include detailed information if test case is public or if it failed
        ...(result.isPublic || !result.passed
          ? {
              stdout: result.stdout,
              expected: result.isPublic ? result.expected : undefined,
              stderr: result.stderr,
              compileOutput: result.compile_output,
            }
          : {}),
        memory: result.memory,
        time: result.time,
      };
    });

    // Count passed test cases and get total
    const passedTestCases = sanitizedResults.filter(
      (result) => result.passed
    ).length;
    const totalTestCases = sanitizedResults.length;

    return res.status(200).json({
      success: true,
      allPassedFlag: allPassed,
      message: allPassed ? 'All test cases passed!' : 'Some test cases failed.',
      submission: {
        language: getLanguageName(language_id),
        status: allPassed ? 'Accepted' : 'Wrong Answer',
        performance: performanceMetrics,
        testCasesPassed: `${passedTestCases}/${totalTestCases}`,
      },
    });
  } catch (error) {
    console.error('Error submitting problem:', error);
    return res.status(500).json({ error: 'Failed to submit problem' });
  }
};



