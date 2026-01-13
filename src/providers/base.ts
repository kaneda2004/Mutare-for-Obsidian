import { LLMResponse, ProviderConfig } from '../types';

export interface LLMRequestContext {
  noteContent: string;        // Full note with line numbers
  userInstruction: string;    // What the user wants to accomplish
  systemPrompt: string;       // Configurable system prompt
}

export abstract class LLMProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract get name(): string;

  /**
   * Send note content to LLM and receive structured edit instructions
   * All providers must return validated LLMResponse
   */
  abstract generateEdits(context: LLMRequestContext): Promise<LLMResponse>;

  /**
   * Validate API key by making a minimal request
   */
  abstract validateApiKey(): Promise<boolean>;
}
