import { LLMResponse, ProviderConfig, ProviderError } from '../types';

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

// ============================================
// Retry Logic with Error Classification
// ============================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Classify an error and determine if it's retryable
 */
function classifyError(error: Error, providerName: string): ProviderError {
  const message = error.message.toLowerCase();

  // Auth errors - not retryable
  if (message.includes('401') || message.includes('unauthorized') ||
      message.includes('invalid api key') || message.includes('authentication') ||
      message.includes('invalid_api_key') || message.includes('incorrect api key')) {
    return new ProviderError(
      `${providerName} authentication failed. Please check your API key in settings.`,
      'auth',
      false,
      error
    );
  }

  // Rate limits - retryable
  if (message.includes('429') || message.includes('rate limit') ||
      message.includes('too many requests') || message.includes('quota')) {
    return new ProviderError(
      `${providerName} rate limit exceeded. Retrying...`,
      'rate_limit',
      true,
      error
    );
  }

  // Server errors - retryable
  if (message.includes('500') || message.includes('502') ||
      message.includes('503') || message.includes('504') ||
      message.includes('internal server error') || message.includes('bad gateway')) {
    return new ProviderError(
      `${providerName} server error. Retrying...`,
      'server',
      true,
      error
    );
  }

  // Network errors - retryable
  if (message.includes('network') || message.includes('fetch') ||
      message.includes('timeout') || message.includes('econnrefused') ||
      message.includes('enotfound') || message.includes('connection')) {
    return new ProviderError(
      `Network error connecting to ${providerName}. Check your internet connection.`,
      'network',
      true,
      error
    );
  }

  // Parse errors - not retryable (LLM returned bad output)
  if (message.includes('failed to parse') || message.includes('invalid json') ||
      message.includes('unexpected token')) {
    return new ProviderError(
      `${providerName} returned invalid response. Please try again.`,
      'parse',
      false,
      error
    );
  }

  // Unknown - not retryable by default
  return new ProviderError(
    `${providerName} error: ${error.message}`,
    'unknown',
    false,
    error
  );
}

/**
 * Wrap an async operation with retry logic and error classification
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  providerName: string
): Promise<T> {
  let lastError: ProviderError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const originalError = error instanceof Error ? error : new Error(String(error));
      const classified = classifyError(originalError, providerName);
      lastError = classified;

      // Don't retry if not retryable or on last attempt
      if (!classified.retryable || attempt === MAX_RETRIES - 1) {
        throw classified;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This line should never be reached due to the loop logic,
  // but TypeScript needs a throw statement here
  throw lastError ?? new ProviderError('Unexpected retry failure', 'unknown', false);
}
