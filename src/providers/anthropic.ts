import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMRequestContext } from './base';
import { LLMResponse, LLMResponseSchema, ProviderConfig } from '../types';

const JSON_INSTRUCTION = `\n\nIMPORTANT: You must respond with ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON. Your entire response must be parseable JSON matching this exact schema:
{
  "reasoning": "string (optional)",
  "edits": [
    {"line": number, "action": "replace" | "insert" | "delete", "content": "string"}
  ]
}`;

export class AnthropicProvider extends LLMProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  get name(): string {
    return 'Anthropic Claude';
  }

  async generateEdits(context: LLMRequestContext): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      system: context.systemPrompt + JSON_INSTRUCTION,
      messages: [
        {
          role: 'user',
          content: `${context.userInstruction}\n\n---\n\nNote content:\n${context.noteContent}`,
        },
      ],
    });

    // Extract text content from response
    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    // Parse and validate with Zod
    const text = textBlock.text.trim();
    // Handle potential markdown code blocks
    const jsonText = text.startsWith('```')
      ? text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : text;

    const parsed = JSON.parse(jsonText);
    return LLMResponseSchema.parse(parsed);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
