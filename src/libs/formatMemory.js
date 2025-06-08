/**
 * Formats memory value from KB to appropriate unit (KB or MB)
 * @param {number|string} memoryKB - Memory value in KB
 * @returns {string|undefined} Formatted memory string or undefined if no memory value
 *
 * @example
 * formatMemory(512) // "512 KB"
 * formatMemory(1536) // "1.50 MB"
 * formatMemory("2048") // "2.00 MB"
 * formatMemory(null) // undefined
 */
export const formatMemory = (memoryKB) => {
  if (memoryKB === undefined || memoryKB === null || memoryKB === '')
    return undefined;

  const kb = parseFloat(memoryKB);
  if (isNaN(kb)) return undefined;

  if (kb >= 1024) {
    const mb = (kb / 1024).toFixed(2);
    return `${mb} MB`;
  }
  return `${kb.toFixed(2)} KB`;
};
  

// If you prefer CommonJS exports:
// module.exports = { formatMemory };
