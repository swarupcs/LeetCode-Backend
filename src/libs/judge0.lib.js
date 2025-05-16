import axios from "axios";

export const getJudge0LanguageId = (language) => {
  const languageMap = {
    PYTHON: 71,
    JAVA: 62,
    JAVASCRIPT: 63,
  };

  return languageMap[language.toUpperCase()];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 This function, pollBatchResults, continuously checks the status of a batch of submissions on the Judge0 API 
 until all submissions have completed (i.e., their status is not 1 or 2, 
 which likely represent "in progress" or "pending" states). 
 It returns the results once all submissions are done.
 */

 /*
This  function named sends a batch of submissions to 
the Judge0 API. It takes an array of submissions as input, posts it to the API, 
logs the response data, and returns an array of submission tokens.
 */
export const pollBatchResults = async (tokens) => {
  while (true) {
    const { data } = await axios.get(
      `${process.env.JUDGE0_API_URL}/submissions/batch`,
      {
        params: {
          tokens: tokens.join(","),
          base64_encoded: false,
        },
      }
    );

    const results = data.submissions;

    const isAllDone = results.every(
      (r) => r.status.id !== 1 && r.status.id !== 2
    );

    if (isAllDone) return results;
    await sleep(1000);
  }
};


/*


This function sends a batch of submissions to the Judge0 API and 
returns an array of submission tokens. It takes an array of submissions as input, 
posts it to the API, logs the response data, and returns the response.
*/
export const submitBatch = async (submissions) => {
  const { data } = await axios.post(
    `${process.env.JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
    {
      submissions,
    }
  );

  console.log("Submission Results: ", data);

  return data; // [{token} , {token} , {token}]
};


export function getLanguageName(languageId) {
  const LANGUAGE_NAMES = {
    74: 'TypeScript',
    63: 'JavaScript',
    71: 'Python',
    62: 'Java',
  };

  return LANGUAGE_NAMES[languageId] || 'Unknown';
}