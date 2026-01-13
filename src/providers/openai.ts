import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LLMProvider, LLMRequestContext } from './base';
import { LLMResponse, LLMResponseSchema, ProviderConfig } from '../types';

export class OpenAIProvider extends LLMProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // Required for Obsidian environment
    });
  }

  get name(): string {
    return 'OpenAI';
  }

  async generateEdits(context: LLMRequestContext): Promise<LLMResponse> {
    const schema = zodToJsonSchema(LLMResponseSchema);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: context.systemPrompt },
        {
          role: 'user',
          content: `${context.userInstruction}\n\n---\n\nNote content:\n${context.noteContent}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'edit_response',
          strict: true,
          schema: schema as Record<string, unknown>,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate with Zod
    const parsed = JSON.parse(content);
    return LLMResponseSchema.parse(parsed);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
