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
// Plugin Settings
// ============================================

export interface MutareSettings {
  provider: ProviderType;
  apiKeys: Record<ProviderType, string>;
  models: Record<ProviderType, string>;
  customSystemPrompt: string;
  confirmBeforeApply: boolean;
  showReasoning: boolean;
}

export const DEFAULT_SETTINGS: MutareSettings = {
  provider: 'anthropic',
  apiKeys: {
    anthropic: '',
    openai: '',
    gemini: '',
  },
  models: {
    anthropic: 'claude-sonnet-4-5',
    openai: 'gpt-5.1',
    gemini: 'gemini-3-flash',
  },
  customSystemPrompt: '',
  confirmBeforeApply: true,
  showReasoning: true,
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
