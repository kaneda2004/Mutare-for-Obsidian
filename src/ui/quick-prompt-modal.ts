import { App, FuzzySuggestModal } from 'obsidian';
import { SavedPrompt } from '../types';

export class QuickPromptModal extends FuzzySuggestModal<SavedPrompt> {
  private prompts: SavedPrompt[];
  private onChoose: (prompt: SavedPrompt) => void;

  constructor(app: App, prompts: SavedPrompt[], onChoose: (prompt: SavedPrompt) => void) {
    super(app);
    this.prompts = prompts;
    this.onChoose = onChoose;
    this.setPlaceholder('Select a quick action...');
  }

  getItems(): SavedPrompt[] {
    return this.prompts;
  }

  getItemText(prompt: SavedPrompt): string {
    return prompt.name;
  }

  onChooseItem(prompt: SavedPrompt, evt: MouseEvent | KeyboardEvent): void {
    this.onChoose(prompt);
  }
}
