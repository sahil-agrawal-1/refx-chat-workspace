/**
 * Line-based diff computation utility for File Modification Reviews
 */

export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
}

/**
 * Computes a simple Myers-style line diff between two text contents.
 */
export function computeLineDiff(originalText: string, newText: string): DiffResult {
  const origLines = originalText ? originalText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  // Simple and robust LCS-based line comparison
  const m = origLines.length;
  const n = newLines.length;

  // Dynamic programming matrix for LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (origLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build the diff
  let i = m;
  let j = n;
  const resultStack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === newLines[j - 1]) {
      resultStack.push({
        type: 'context',
        text: origLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      unchanged++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      resultStack.push({
        type: 'add',
        text: newLines[j - 1],
        newLineNumber: j,
      });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      resultStack.push({
        type: 'delete',
        text: origLines[i - 1],
        oldLineNumber: i,
      });
      deletions++;
      i--;
    }
  }

  // Reverse since we backtracked from end
  resultStack.reverse();

  return {
    lines: resultStack,
    additions,
    deletions,
    unchanged,
  };
}

/**
 * Filter memories by search keyword and category/tags
 */
export function filterMemories<T extends { title: string; content?: string; summary?: string; tags?: string[] }>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(q);
    const contentMatch = (item.content || item.summary || '').toLowerCase().includes(q);
    const tagMatch = item.tags ? item.tags.some((t) => t.toLowerCase().includes(q)) : false;
    return titleMatch || contentMatch || tagMatch;
  });
}
