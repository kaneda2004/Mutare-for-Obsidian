import { z } from 'zod';

// ============================================
// Edit Instruction Schema (Zod for all providers)
// ============================================

export const EditInstructionSchema = z.object({
  line: z.number().int().min(0).describe('0-indexed line number to edit'),
  action: z.enum(['replace', 'insert', 'delete']).describe(
    'replace: replace line content, insert: add new line before this line, delete: remove this line'
  ),
  content: z.string().describe('New content for the line (empty string for delete)'),
});

export const LLMResponseSchema = z.object({
  reasoning: z.string().optional().describe('Brief explanation of what changes are being made and why'),
  edits: z.array(EditInstructionSchema).describe('Array of edit instructions to apply'),
});

export type EditInstruction = z.infer<typeof EditInstructionSchema>;
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// ============================================
// Provider Configuration
// ============================================

export type ProviderType = 'anthropic' | 'openai' | 'gemini';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model: string;
}

export const PROVIDER_MODELS: Record<ProviderType, string[]> = {
  anthropic: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-5'],
  openai: ['gpt-5.2', 'gpt-5.1', 'gpt-5.1-mini', 'gpt-4.1', 'gpt-4.1-mini'],
  gemini: ['gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
};

export const PROVIDER_NAMES: Record<ProviderType, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
};

// ============================================
// Saved Prompts
// ============================================

export interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
}

export const DEFAULT_PROMPTS: SavedPrompt[] = [
  { id: 'auto-improve', name: 'Auto Improve', prompt: 'Analyze this note and make intelligent improvements: fix typos and grammar, improve clarity and flow, enhance formatting and structure, and add any missing elements that would make it more useful. Preserve the original meaning and voice.' },
  { id: 'fix-grammar', name: 'Fix Grammar & Typos', prompt: 'Fix any typos, grammar issues, and spelling mistakes.' },
  { id: 'improve-clarity', name: 'Improve Clarity', prompt: 'Improve the clarity and readability of this note while preserving the meaning.' },
  { id: 'make-concise', name: 'Make Concise', prompt: 'Make this note more concise by removing redundancy and unnecessary words.' },
  { id: 'add-summary', name: 'Add Summary', prompt: 'Add a brief TL;DR summary at the top of this note.' },
  { id: 'convert-bullets', name: 'Convert to Bullets', prompt: 'Convert this content into a well-organized bulleted list.' },
  { id: 'format-table', name: 'Format as Table', prompt: 'Convert this content into a markdown table with appropriate columns.' },
  { id: 'generate-template', name: 'Generate Template', prompt: 'Based on the description in this note, create a reusable Obsidian template with appropriate markdown formatting, YAML frontmatter if useful, placeholder text in {{double-braces}}, headings, sections, and any relevant structure. Replace the current content with the generated template.' },
];

// ============================================
// Edit History
// ============================================

export interface EditHistoryEntry {
  id: string;
  timestamp: number;
  notePath: string;
  instruction: string;
  beforeContent: string;
  afterContent: string;
  editsApplied: number;
}

// ============================================
// Plugin Settings
// ============================================

export interface MutareSettings {
  provider: ProviderType;
  apiKeys: Record<ProviderType, string>;
  models: Record<ProviderType, string>;
  customSystemPrompt: string;
  confirmBeforeApply: boolean;
  showReasoning: boolean;
  savedPrompts: SavedPrompt[];
  editHistory: EditHistoryEntry[];
  maxHistoryEntries: number;
  showRibbonIcon: boolean;
  showStatusBar: boolean;
}

export const DEFAULT_SETTINGS: MutareSettings = {
  provider: 'anthropic',
  apiKeys: {
    anthropic: '',
    openai: '',
    gemini: '',
  },
  models: {
    anthropic: 'claude-haiku-4-5',
    openai: 'gpt-5.1-mini',
    gemini: 'gemini-3-flash',
  },
  customSystemPrompt: '',
  confirmBeforeApply: true,
  showReasoning: true,
  savedPrompts: DEFAULT_PROMPTS,
  editHistory: [],
  maxHistoryEntries: 50,
  showRibbonIcon: true,
  showStatusBar: true,
};

// ============================================
// Editor Position (matches Obsidian's EditorPosition)
// ============================================

export interface EditorPosition {
  line: number;
  ch: number;
}

// ============================================
// Apply Result
// ============================================

export interface ApplyResult {
  success: boolean;
  appliedCount: number;
  errors: string[];
}

// ============================================
// Provider Errors
// ============================================

export type ProviderErrorType = 'auth' | 'rate_limit' | 'network' | 'server' | 'parse' | 'unknown';

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly type: ProviderErrorType,
    public readonly retryable: boolean,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
