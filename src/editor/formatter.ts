/**
 * Format note content with line numbers for LLM consumption
 * Uses 0-indexed line numbers to match the edit instruction schema
 */
export function formatNoteWithLineNumbers(content: string): string {
  const lines = content.split('\n');
  const padWidth = String(lines.length - 1).length;

  return lines
    .map((line, index) => `${String(index).padStart(padWidth, ' ')} | ${line}`)
    .join('\n');
}

/**
 * Parse note content back from line-numbered format (if needed)
 */
export function parseLineNumberedContent(formatted: string): string[] {
  const lines = formatted.split('\n');
  return lines.map(line => {
    // Remove line number prefix: "   0 | content" -> "content"
    const match = line.match(/^\s*\d+\s*\|\s?(.*)$/);
    return match ? match[1] : line;
  });
}
