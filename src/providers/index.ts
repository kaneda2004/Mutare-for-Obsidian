import { LLMProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { ProviderConfig } from '../types';

export { LLMProvider } from './base';
export type { LLMRequestContext } from './base';

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    default: {
      const exhaustiveCheck: never = config.type;
      throw new Error(`Unknown provider type: ${exhaustiveCheck as string}`);
    }
  }
}
