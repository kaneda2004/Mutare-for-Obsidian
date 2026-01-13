import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { MutareSettings, DEFAULT_SETTINGS, ProviderConfig } from './types';
import { MutareSettingTab } from './settings';
import { createProvider, LLMRequestContext } from './providers';
import { formatNoteWithLineNumbers } from './editor/formatter';
import { applyEdits, previewEdits } from './editor/applier';
import { buildSystemPrompt } from './prompts/system';
import { EditPreviewModal, InstructionModal, StatusManager } from './ui';

export default class MutarePlugin extends Plugin {
  settings: MutareSettings;
  private status: StatusManager;

  async onload() {
    await this.loadSettings();
    this.status = new StatusManager();

    // Command 1: Edit with modal prompt
    this.addCommand({
      id: 'edit-note',
      name: 'Edit note',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const modal = new InstructionModal(this.app);
        const result = await modal.waitForResult();

        if (result.instruction) {
          await this.executeAIEdit(editor, result.instruction);
        }
      },
    });

    // Command 2: Edit with selection as instruction
    this.addCommand({
      id: 'edit-with-selection',
      name: 'Edit with selection',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (!selection.trim()) {
          new Notice('Please select text to use as the editing instruction');
          return;
        }
        await this.executeAIEdit(editor, selection);
      },
    });

    // Command 3: Auto-improve with default instruction
    this.addCommand({
      id: 'auto-improve',
      name: 'Auto-improve',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const instruction =
          'Review this note and make appropriate improvements: fix typos, improve grammar, enhance clarity, and complete any obvious missing information. Be conservative - only make changes that clearly improve the note.';
        await this.executeAIEdit(editor, instruction);
      },
    });

    // Add settings tab
    this.addSettingTab(new MutareSettingTab(this.app, this));
  }

  private async executeAIEdit(editor: Editor, instruction: string) {
    // Validate API key exists
    const apiKey = this.settings.apiKeys[this.settings.provider];
    if (!apiKey) {
      new Notice(`Please set your ${this.settings.provider} API key in Mutare settings`);
      return;
    }

    this.status.showProcessing('Mutare: Analyzing note with AI...');

    try {
      // Create provider
      const config: ProviderConfig = {
        type: this.settings.provider,
        apiKey,
        model: this.settings.models[this.settings.provider],
      };
      const provider = createProvider(config);

      // Prepare context
      const noteContent = editor.getValue();
      const formattedContent = formatNoteWithLineNumbers(noteContent);
      const systemPrompt = buildSystemPrompt(this.settings.customSystemPrompt);

      const context: LLMRequestContext = {
        noteContent: formattedContent,
        userInstruction: instruction,
        systemPrompt,
      };

      // Call LLM
      const response = await provider.generateEdits(context);

      this.status.dismiss();

      // Validate response has edits
      if (!response.edits || response.edits.length === 0) {
        this.status.showSuccess('Mutare: AI found no changes to make');
        return;
      }

      // Preview or apply directly
      if (this.settings.confirmBeforeApply) {
        const preview = previewEdits(noteContent, response.edits);

        const modal = new EditPreviewModal(
          this.app,
          response,
          noteContent,
          preview,
          this.settings.showReasoning
        );

        const result = await modal.waitForResult();

        if (result.confirmed) {
          const applyResult = applyEdits(editor, response.edits);
          if (applyResult.success) {
            this.status.showSuccess(`Mutare: Applied ${applyResult.appliedCount} edits`);
          } else {
            this.status.showError(
              `Applied ${applyResult.appliedCount} edits with errors: ${applyResult.errors.join(', ')}`
            );
          }
        } else {
          this.status.showSuccess('Mutare: Edit cancelled');
        }
      } else {
        const applyResult = applyEdits(editor, response.edits);
        if (applyResult.success) {
          this.status.showSuccess(`Mutare: Applied ${applyResult.appliedCount} edits`);
        } else {
          this.status.showError(
            `Applied ${applyResult.appliedCount} edits with errors: ${applyResult.errors.join(', ')}`
          );
        }
      }
    } catch (error) {
      this.status.dismiss();
      console.error('Mutare error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.status.showError(message);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
