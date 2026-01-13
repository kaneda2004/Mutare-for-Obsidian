import { Editor, MarkdownView, Menu, Notice, Plugin, setIcon } from 'obsidian';
import { MutareSettings, DEFAULT_SETTINGS, ProviderConfig, EditHistoryEntry, SavedPrompt } from './types';
import { MutareSettingTab } from './settings';
import { createProvider, LLMRequestContext } from './providers';
import { formatNoteWithLineNumbers } from './editor/formatter';
import { applyEdits, previewEdits } from './editor/applier';
import { buildSystemPrompt } from './prompts/system';
import { EditPreviewModal, InstructionModal, QuickPromptModal, HistoryModal } from './ui';

export default class MutarePlugin extends Plugin {
  settings: MutareSettings;
  private statusBarEl: HTMLElement | null = null;
  private ribbonIconEl: HTMLElement | null = null;

  async onload() {
    await this.loadSettings();

    // ========================================
    // Ribbon Icon
    // ========================================
    if (this.settings.showRibbonIcon) {
      this.setupRibbonIcon();
    }

    // ========================================
    // Status Bar
    // ========================================
    if (this.settings.showStatusBar) {
      this.setupStatusBar();
    }

    // ========================================
    // Commands
    // ========================================

    // Command 1: Edit with modal prompt
    this.addCommand({
      id: 'edit-note',
      name: 'Edit note',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const modal = new InstructionModal(this.app);
        const result = await modal.waitForResult();

        if (result.instruction) {
          await this.executeAIEdit(editor, view, result.instruction);
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
        await this.executeAIEdit(editor, view, selection);
      },
    });

    // Command 3: Auto-improve with default instruction
    this.addCommand({
      id: 'auto-improve',
      name: 'Auto-improve',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const instruction =
          'Review this note and make appropriate improvements: fix typos, improve grammar, enhance clarity, and complete any obvious missing information. Be conservative - only make changes that clearly improve the note.';
        await this.executeAIEdit(editor, view, instruction);
      },
    });

    // Command 4: Quick prompts
    this.addCommand({
      id: 'quick-prompts',
      name: 'Quick prompts',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        new QuickPromptModal(this.app, this.settings.savedPrompts, async (prompt) => {
          await this.executeAIEdit(editor, view, prompt.prompt);
        }).open();
      },
    });

    // Command 5: View history
    this.addCommand({
      id: 'view-history',
      name: 'View edit history',
      callback: async () => {
        const modal = new HistoryModal(this.app, this.settings.editHistory);
        const result = await modal.waitForResult();

        if (result.action === 'revert' && result.entry) {
          await this.revertToHistory(result.entry);
        }
      },
    });

    // Commands for each saved prompt (for hotkey binding)
    for (const prompt of this.settings.savedPrompts) {
      this.addCommand({
        id: `quick-${prompt.id}`,
        name: `Quick: ${prompt.name}`,
        editorCallback: async (editor: Editor, view: MarkdownView) => {
          await this.executeAIEdit(editor, view, prompt.prompt);
        },
      });
    }

    // ========================================
    // Context Menu
    // ========================================
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();

        // Always add "Edit note" option
        menu.addItem((item) => {
          item
            .setTitle('Mutare: Edit note')
            .setIcon('wand')
            .onClick(async () => {
              const modal = new InstructionModal(this.app);
              const result = await modal.waitForResult();
              if (result.instruction) {
                await this.executeAIEdit(editor, view, result.instruction);
              }
            });
        });

        // Add "Edit with selection" if text is selected
        if (selection.trim()) {
          menu.addItem((item) => {
            item
              .setTitle('Mutare: Use selection as instruction')
              .setIcon('text-cursor-input')
              .onClick(async () => {
                await this.executeAIEdit(editor, view, selection);
              });
          });
        }

        // Add quick prompts submenu
        menu.addItem((item) => {
          item
            .setTitle('Mutare: Quick prompts')
            .setIcon('zap')
            .onClick(() => {
              new QuickPromptModal(this.app, this.settings.savedPrompts, async (prompt) => {
                await this.executeAIEdit(editor, view, prompt.prompt);
              }).open();
            });
        });

        // Add auto-improve option
        menu.addItem((item) => {
          item
            .setTitle('Mutare: Auto-improve')
            .setIcon('sparkles')
            .onClick(async () => {
              const instruction =
                'Review this note and make appropriate improvements: fix typos, improve grammar, enhance clarity, and complete any obvious missing information. Be conservative - only make changes that clearly improve the note.';
              await this.executeAIEdit(editor, view, instruction);
            });
        });
      })
    );

    // ========================================
    // Slash Commands (Editor Extension)
    // ========================================
    this.registerSlashCommands();

    // Add settings tab
    this.addSettingTab(new MutareSettingTab(this.app, this));
  }

  onunload() {
    if (this.statusBarEl) {
      this.statusBarEl.remove();
    }
  }

  // ========================================
  // Ribbon Icon
  // ========================================
  private setupRibbonIcon() {
    this.ribbonIconEl = this.addRibbonIcon('wand', 'Mutare', (evt: MouseEvent) => {
      const menu = new Menu();

      menu.addItem((item) => {
        item
          .setTitle('Edit note')
          .setIcon('pencil')
          .onClick(async () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              const modal = new InstructionModal(this.app);
              const result = await modal.waitForResult();
              if (result.instruction) {
                await this.executeAIEdit(view.editor, view, result.instruction);
              }
            } else {
              new Notice('Please open a note first');
            }
          });
      });

      menu.addItem((item) => {
        item
          .setTitle('Quick prompts')
          .setIcon('zap')
          .onClick(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              new QuickPromptModal(this.app, this.settings.savedPrompts, async (prompt) => {
                await this.executeAIEdit(view.editor, view, prompt.prompt);
              }).open();
            } else {
              new Notice('Please open a note first');
            }
          });
      });

      menu.addItem((item) => {
        item
          .setTitle('Auto-improve')
          .setIcon('sparkles')
          .onClick(async () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              const instruction =
                'Review this note and make appropriate improvements: fix typos, improve grammar, enhance clarity, and complete any obvious missing information.';
              await this.executeAIEdit(view.editor, view, instruction);
            } else {
              new Notice('Please open a note first');
            }
          });
      });

      menu.addSeparator();

      menu.addItem((item) => {
        item
          .setTitle('View history')
          .setIcon('history')
          .onClick(async () => {
            const modal = new HistoryModal(this.app, this.settings.editHistory);
            const result = await modal.waitForResult();
            if (result.action === 'revert' && result.entry) {
              await this.revertToHistory(result.entry);
            }
          });
      });

      menu.showAtMouseEvent(evt);
    });
  }

  // ========================================
  // Status Bar
  // ========================================
  private setupStatusBar() {
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass('mutare-status-bar');
    this.updateStatusBar('ready');

    // Make clickable
    this.statusBarEl.onClickEvent((evt) => {
      const menu = new Menu();

      menu.addItem((item) => {
        item.setTitle('Edit current note').setIcon('pencil').onClick(async () => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) {
            const modal = new InstructionModal(this.app);
            const result = await modal.waitForResult();
            if (result.instruction) {
              await this.executeAIEdit(view.editor, view, result.instruction);
            }
          }
        });
      });

      menu.addItem((item) => {
        item.setTitle('Quick prompts').setIcon('zap').onClick(() => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) {
            new QuickPromptModal(this.app, this.settings.savedPrompts, async (prompt) => {
              await this.executeAIEdit(view.editor, view, prompt.prompt);
            }).open();
          }
        });
      });

      menu.addSeparator();

      menu.addItem((item) => {
        item.setTitle(`Provider: ${this.settings.provider}`).setDisabled(true);
      });

      menu.showAtMouseEvent(evt);
    });
  }

  private updateStatusBar(state: 'ready' | 'processing' | 'success' | 'error', message?: string) {
    if (!this.statusBarEl) return;

    this.statusBarEl.empty();

    const iconEl = this.statusBarEl.createSpan({ cls: 'mutare-status-icon' });
    const textEl = this.statusBarEl.createSpan({ cls: 'mutare-status-text' });

    switch (state) {
      case 'ready':
        setIcon(iconEl, 'wand');
        textEl.setText('Mutare');
        this.statusBarEl.removeClass('mutare-processing', 'mutare-error');
        break;
      case 'processing':
        setIcon(iconEl, 'loader');
        textEl.setText(message || 'Processing...');
        this.statusBarEl.addClass('mutare-processing');
        this.statusBarEl.removeClass('mutare-error');
        break;
      case 'success':
        setIcon(iconEl, 'check');
        textEl.setText(message || 'Done');
        this.statusBarEl.removeClass('mutare-processing', 'mutare-error');
        // Reset after 3 seconds
        setTimeout(() => this.updateStatusBar('ready'), 3000);
        break;
      case 'error':
        setIcon(iconEl, 'alert-circle');
        textEl.setText(message || 'Error');
        this.statusBarEl.addClass('mutare-error');
        this.statusBarEl.removeClass('mutare-processing');
        // Reset after 5 seconds
        setTimeout(() => this.updateStatusBar('ready'), 5000);
        break;
    }
  }

  // ========================================
  // Slash Commands (placeholder - full implementation requires EditorSuggest subclass)
  // ========================================
  private registerSlashCommands() {
    // Slash commands would require a proper EditorSuggest subclass implementation
    // For now, users can use the command palette (Cmd+P) or quick prompts
    // This is a placeholder for future enhancement
  }

  // ========================================
  // Revert to History
  // ========================================
  private async revertToHistory(entry: EditHistoryEntry) {
    const file = this.app.vault.getAbstractFileByPath(entry.notePath);
    if (!file) {
      new Notice(`File not found: ${entry.notePath}`);
      return;
    }

    try {
      await this.app.vault.modify(file as any, entry.beforeContent);
      new Notice('Reverted to previous version');
    } catch (error) {
      new Notice(`Failed to revert: ${error}`);
    }
  }

  // ========================================
  // Main Edit Execution
  // ========================================
  private async executeAIEdit(editor: Editor, view: MarkdownView, instruction: string) {
    // Validate API key exists
    const apiKey = this.settings.apiKeys[this.settings.provider];
    if (!apiKey) {
      new Notice(`Please set your ${this.settings.provider} API key in Mutare settings`);
      return;
    }

    this.updateStatusBar('processing', 'Analyzing...');

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

      // Validate response has edits
      if (!response.edits || response.edits.length === 0) {
        this.updateStatusBar('success', 'No changes needed');
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
          // Save to history before applying
          await this.saveToHistory(view, instruction, noteContent, preview, response.edits.length);

          const applyResult = applyEdits(editor, response.edits);
          if (applyResult.success) {
            this.updateStatusBar('success', `Applied ${applyResult.appliedCount} edits`);
          } else {
            this.updateStatusBar('error', `Errors: ${applyResult.errors.join(', ')}`);
          }
        } else {
          this.updateStatusBar('ready');
        }
      } else {
        // Save to history before applying
        const preview = previewEdits(noteContent, response.edits);
        await this.saveToHistory(view, instruction, noteContent, preview, response.edits.length);

        const applyResult = applyEdits(editor, response.edits);
        if (applyResult.success) {
          this.updateStatusBar('success', `Applied ${applyResult.appliedCount} edits`);
        } else {
          this.updateStatusBar('error', `Errors: ${applyResult.errors.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('Mutare error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatusBar('error', message.substring(0, 30));
      new Notice(`Mutare error: ${message}`);
    }
  }

  // ========================================
  // History Management
  // ========================================
  private async saveToHistory(
    view: MarkdownView,
    instruction: string,
    beforeContent: string,
    afterContent: string,
    editsApplied: number
  ) {
    const entry: EditHistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      notePath: view.file?.path || 'Unknown',
      instruction,
      beforeContent,
      afterContent,
      editsApplied,
    };

    this.settings.editHistory.unshift(entry);

    // Trim history to max entries
    if (this.settings.editHistory.length > this.settings.maxHistoryEntries) {
      this.settings.editHistory = this.settings.editHistory.slice(0, this.settings.maxHistoryEntries);
    }

    await this.saveSettings();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
