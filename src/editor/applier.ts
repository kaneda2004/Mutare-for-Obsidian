import { Editor } from 'obsidian';
import { EditInstruction, ApplyResult, EditorPosition } from '../types';

/**
 * Simple content hash for change detection.
 * Uses djb2 algorithm - fast and sufficient for change detection.
 */
export function hashContent(content: string): number {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Apply edit instructions to the Obsidian editor
 *
 * CRITICAL: Edits are applied in reverse order (bottom-up) to preserve
 * line numbers for subsequent edits. Without this, insertions and deletions
 * would shift line numbers and cause incorrect edits.
 */
export function applyEdits(editor: Editor, edits: EditInstruction[]): ApplyResult {
  const errors: string[] = [];
  let appliedCount = 0;

  // Sort by line number descending (apply bottom-up)
  const sortedEdits = [...edits].sort((a, b) => b.line - a.line);

  const lineCount = editor.lineCount();

  for (const edit of sortedEdits) {
    try {
      // Validate line number
      if (edit.line < 0) {
        errors.push(`Invalid line number: ${edit.line} (negative)`);
        continue;
      }

      switch (edit.action) {
        case 'replace': {
          if (edit.line >= lineCount) {
            errors.push(`Line ${edit.line} does not exist (only ${lineCount} lines)`);
            continue;
          }
          const lineText = editor.getLine(edit.line);
          const from: EditorPosition = { line: edit.line, ch: 0 };
          const to: EditorPosition = { line: edit.line, ch: lineText.length };
          editor.replaceRange(edit.content, from, to);
          appliedCount++;
          break;
        }

        case 'insert': {
          // Insert creates a new line BEFORE the specified line number
          if (edit.line > lineCount) {
            errors.push(`Cannot insert at line ${edit.line} (only ${lineCount} lines)`);
            continue;
          }
          const insertPos: EditorPosition = { line: edit.line, ch: 0 };
          editor.replaceRange(edit.content + '\n', insertPos);
          appliedCount++;
          break;
        }

        case 'delete': {
          if (edit.line >= lineCount) {
            errors.push(`Line ${edit.line} does not exist (only ${lineCount} lines)`);
            continue;
          }
          // Delete the entire line including the newline character
          const from: EditorPosition = { line: edit.line, ch: 0 };
          const to: EditorPosition = { line: edit.line + 1, ch: 0 };

          // Handle last line (no trailing newline)
          if (edit.line === lineCount - 1) {
            const lineText = editor.getLine(edit.line);
            to.line = edit.line;
            to.ch = lineText.length;
            // Also remove preceding newline if not first line
            if (edit.line > 0) {
              from.line = edit.line - 1;
              from.ch = editor.getLine(edit.line - 1).length;
            }
          }
          editor.replaceRange('', from, to);
          appliedCount++;
          break;
        }

        default:
          errors.push(`Unknown action: ${(edit as EditInstruction).action}`);
      }
    } catch (error) {
      errors.push(`Error applying edit at line ${edit.line}: ${error}`);
    }
  }

  return {
    success: errors.length === 0,
    appliedCount,
    errors,
  };
}

/**
 * Generate a preview of what the note will look like after edits
 * Useful for confirmation modal
 */
export function previewEdits(currentContent: string, edits: EditInstruction[]): string {
  const lines = currentContent.split('\n');

  // Sort by line number descending (apply bottom-up)
  const sortedEdits = [...edits].sort((a, b) => b.line - a.line);

  for (const edit of sortedEdits) {
    switch (edit.action) {
      case 'replace':
        if (edit.line < lines.length) {
          lines[edit.line] = edit.content;
        }
        break;
      case 'insert':
        if (edit.line <= lines.length) {
          lines.splice(edit.line, 0, edit.content);
        }
        break;
      case 'delete':
        if (edit.line < lines.length) {
          lines.splice(edit.line, 1);
        }
        break;
    }
  }

  return lines.join('\n');
}
