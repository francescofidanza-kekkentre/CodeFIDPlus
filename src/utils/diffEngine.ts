import { DiffLine, DiffResult } from '../types';

/**
 * Computes a line-by-line LCS diff between original and modified code.
 * Designed to be fast and dependency-free for instant tablet diff previews.
 */
export function computeLineDiff(originalText: string, modifiedText: string): DiffResult {
  const oldLines = originalText.replace(/\r\n/g, '\n').split('\n');
  const newLines = modifiedText.replace(/\r\n/g, '\n').split('\n');

  const n = oldLines.length;
  const m = newLines.length;

  // Safeguard for very large files to avoid quadratic blowup on mobile CPU
  if (n * m > 250000) {
    return computeFastApproximateDiff(oldLines, newLines);
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const lines: DiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let i = 0;
  let j = 0;
  let oldNum = 1;
  let newNum = 1;

  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      lines.push({
        type: 'unchanged',
        oldLineNumber: oldNum++,
        newLineNumber: newNum++,
        content: oldLines[i],
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({
        type: 'removed',
        oldLineNumber: oldNum++,
        content: oldLines[i],
      });
      removedCount++;
      i++;
    } else {
      lines.push({
        type: 'added',
        newLineNumber: newNum++,
        content: newLines[j],
      });
      addedCount++;
      j++;
    }
  }

  while (i < n) {
    lines.push({
      type: 'removed',
      oldLineNumber: oldNum++,
      content: oldLines[i++],
    });
    removedCount++;
  }

  while (j < m) {
    lines.push({
      type: 'added',
      newLineNumber: newNum++,
      content: newLines[j++],
    });
    addedCount++;
  }

  return { lines, addedCount, removedCount };
}

function computeFastApproximateDiff(oldLines: string[], newLines: string[]): DiffResult {
  const lines: DiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let idx = 0; idx < maxLen; idx++) {
    const oldL = oldLines[idx];
    const newL = newLines[idx];
    if (oldL === newL && oldL !== undefined) {
      lines.push({
        type: 'unchanged',
        oldLineNumber: idx + 1,
        newLineNumber: idx + 1,
        content: oldL,
      });
    } else {
      if (oldL !== undefined) {
        lines.push({
          type: 'removed',
          oldLineNumber: idx + 1,
          content: oldL,
        });
        removedCount++;
      }
      if (newL !== undefined) {
        lines.push({
          type: 'added',
          newLineNumber: idx + 1,
          content: newL,
        });
        addedCount++;
      }
    }
  }

  return { lines, addedCount, removedCount };
}

export function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'typescript';
  }
}
