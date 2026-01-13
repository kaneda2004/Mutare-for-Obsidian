import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LLMProvider, LLMRequestContext, withRetry } from './base';
import { LLMResponse, LLMResponseSchema, ProviderConfig } from '../types';

export class GeminiProvider extends LLMProvider {
  private client: GoogleGenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  get name(): string {
    return 'Google Gemini';
  }

  async generateEdits(context: LLMRequestContext): Promise<LLMResponse> {
    return withRetry(async () => {
      const schema = zodToJsonSchema(LLMResponseSchema);

      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents: `${context.systemPrompt}\n\n---\n\nUser instruction: ${context.userInstruction}\n\n---\n\nNote content:\n${context.noteContent}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema as object,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('No response from Gemini');
      }

      // Parse and validate with Zod
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        throw new Error(
          `Failed to parse Gemini response as JSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`
        );
      }
      return LLMResponseSchema.parse(parsed);
    }, this.name);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hi',
      });
      return true;
    } catch {
      return false;
    }
  }
}
