import { App, Modal, ButtonComponent } from 'obsidian';
import { LLMResponse } from '../types';

export interface PreviewModalResult {
  confirmed: boolean;
}

export class EditPreviewModal extends Modal {
  private response: LLMResponse;
  private currentContent: string;
  private previewContent: string;
  private showReasoning: boolean;
  private resolvePromise: ((result: PreviewModalResult) => void) | null = null;

  constructor(
    app: App,
    response: LLMResponse,
    currentContent: string,
    previewContent: string,
    showReasoning: boolean
  ) {
    super(app);
    this.response = response;
    this.currentContent = currentContent;
    this.previewContent = previewContent;
    this.showReasoning = showReasoning;
  }

  async waitForResult(): Promise<PreviewModalResult> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  private confirmAndClose() {
    if (this.resolvePromise) {
      this.resolvePromise({ confirmed: true });
    }
    this.close();
  }

  private cancelAndClose() {
    if (this.resolvePromise) {
      this.resolvePromise({ confirmed: false });
    }
    this.close();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('mutare-preview-modal');

    // Register keyboard shortcut
    this.scope.register(['Mod'], 'Enter', (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.confirmAndClose();
    });

    // Title with top action bar
    const headerEl = contentEl.createDiv({ cls: 'mutare-header' });
    headerEl.createEl('h2', { text: 'Review Proposed Edits' });

    const topButtonContainer = headerEl.createDiv({ cls: 'mutare-top-buttons' });
    new ButtonComponent(topButtonContainer)
      .setButtonText('Apply Edits')
      .setCta()
      .onClick(() => this.confirmAndClose());

    const shortcutHint = topButtonContainer.createEl('span', {
      cls: 'mutare-shortcut-hint',
      text: '⌘↵'
    });
    shortcutHint.setAttribute('aria-label', 'Cmd+Enter to apply');

    // Reasoning (if provided and enabled)
    if (this.showReasoning && this.response.reasoning) {
      const reasoningEl = contentEl.createDiv({ cls: 'mutare-reasoning' });
      reasoningEl.createEl('h4', { text: 'AI Reasoning' });
      reasoningEl.createEl('p', { text: this.response.reasoning });
    }

    // Edit summary
    const summaryEl = contentEl.createDiv({ cls: 'mutare-summary' });
    summaryEl.createEl('h4', { text: `Proposed Changes (${this.response.edits.length})` });

    const editList = summaryEl.createEl('ul', { cls: 'mutare-edit-list' });
    for (const edit of this.response.edits) {
      const li = editList.createEl('li');
      const actionClass = `mutare-action-${edit.action}`;
      li.createEl('span', { text: `Line ${edit.line}: `, cls: 'mutare-line-num' });
      li.createEl('span', { text: edit.action, cls: actionClass });
      if (edit.action !== 'delete' && edit.content) {
        const preview = edit.content.length > 80
          ? edit.content.substring(0, 80) + '...'
          : edit.content;
        li.createEl('pre', { text: preview, cls: 'mutare-content-preview' });
      }
    }

    // Preview section
    const diffEl = contentEl.createDiv({ cls: 'mutare-diff' });
    diffEl.createEl('h4', { text: 'Preview Result' });

    const previewContainer = diffEl.createDiv({ cls: 'mutare-preview-container' });
    const previewPre = previewContainer.createEl('pre', { cls: 'mutare-preview-content' });
    previewPre.setText(this.previewContent);

    // Bottom buttons
    const buttonContainer = contentEl.createDiv({ cls: 'mutare-buttons' });

    new ButtonComponent(buttonContainer)
      .setButtonText('Cancel')
      .onClick(() => this.cancelAndClose());

    new ButtonComponent(buttonContainer)
      .setButtonText('Apply Edits')
      .setCta()
      .onClick(() => this.confirmAndClose());
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    // Ensure promise is resolved if modal is closed another way
    if (this.resolvePromise) {
      this.resolvePromise({ confirmed: false });
      this.resolvePromise = null;
    }
  }
}
