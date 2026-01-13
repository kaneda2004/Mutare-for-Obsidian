import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import MutarePlugin from '../main';
import { SavedPrompt } from '../types';

interface SlashCommand {
  id: string;
  name: string;
  description: string;
  action: 'prompt' | 'quick-prompt' | 'auto-improve';
  prompt?: SavedPrompt;
}

export class MutareSlashSuggest extends EditorSuggest<SlashCommand> {
  private plugin: MutarePlugin;

  constructor(plugin: MutarePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const beforeCursor = line.substring(0, cursor.ch);

    // Match /mutare at start of line or after whitespace
    const match = beforeCursor.match(/(?:^|\s)(\/mutare)(\s+\S*)?$/);
    if (!match) {
      return null;
    }

    const triggerStart = match.index! + (match[0].startsWith(' ') ? 1 : 0);

    return {
      start: { line: cursor.line, ch: triggerStart },
      end: cursor,
      query: match[2]?.trim() || '',
    };
  }

  getSuggestions(context: EditorSuggestContext): SlashCommand[] {
    const query = context.query.toLowerCase();

    const commands: SlashCommand[] = [
      { id: 'edit', name: 'Edit', description: 'Open instruction modal', action: 'prompt' },
      { id: 'auto', name: 'Auto-improve', description: 'Automatically improve this note', action: 'auto-improve' },
    ];

    // Add saved prompts
    for (const prompt of this.plugin.settings.savedPrompts) {
      commands.push({
        id: `quick-${prompt.id}`,
        name: prompt.name,
        description: prompt.prompt.length > 50 ? prompt.prompt.substring(0, 50) + '...' : prompt.prompt,
        action: 'quick-prompt',
        prompt,
      });
    }

    // Filter by query
    if (query) {
      return commands.filter(cmd =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query)
      );
    }

    return commands;
  }

  renderSuggestion(command: SlashCommand, el: HTMLElement): void {
    el.addClass('mutare-slash-suggestion');

    const titleEl = el.createDiv({ cls: 'mutare-slash-title' });
    titleEl.setText(command.name);

    const descEl = el.createDiv({ cls: 'mutare-slash-desc' });
    descEl.setText(command.description);
  }

  selectSuggestion(command: SlashCommand, evt: MouseEvent | KeyboardEvent): void {
    const { editor, start, end } = this.context!;

    // Remove the /mutare trigger text
    editor.replaceRange('', start, end);

    // Execute the command
    void this.plugin.executeSlashCommand(command.action, command.prompt);
  }
}
