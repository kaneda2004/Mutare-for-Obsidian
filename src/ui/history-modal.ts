import { App, Modal, Setting, ButtonComponent } from 'obsidian';
import { EditHistoryEntry } from '../types';

export interface HistoryModalResult {
  action: 'revert' | 'close';
  entry?: EditHistoryEntry;
}

export class HistoryModal extends Modal {
  private history: EditHistoryEntry[];
  private onAction: (result: HistoryModalResult) => void;
  private resolvePromise: (result: HistoryModalResult) => void;

  constructor(app: App, history: EditHistoryEntry[]) {
    super(app);
    this.history = history;
  }

  async waitForResult(): Promise<HistoryModalResult> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('mutare-history-modal');

    contentEl.createEl('h2', { text: 'Edit History' });

    if (this.history.length === 0) {
      contentEl.createEl('p', {
        text: 'No edit history yet. History will appear here after you make edits.',
        cls: 'mutare-history-empty',
      });
      return;
    }

    const listEl = contentEl.createDiv({ cls: 'mutare-history-list' });

    for (const entry of this.history.slice().reverse()) {
      const itemEl = listEl.createDiv({ cls: 'mutare-history-item' });

      const infoEl = itemEl.createDiv({ cls: 'mutare-history-info' });

      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleString();

      infoEl.createEl('div', {
        text: entry.notePath.split('/').pop() || entry.notePath,
        cls: 'mutare-history-note',
      });
      infoEl.createEl('div', {
        text: `"${entry.instruction.substring(0, 50)}${entry.instruction.length > 50 ? '...' : ''}"`,
        cls: 'mutare-history-instruction',
      });
      infoEl.createEl('div', {
        text: `${timeStr} • ${entry.editsApplied} edits`,
        cls: 'mutare-history-meta',
      });

      const actionsEl = itemEl.createDiv({ cls: 'mutare-history-actions' });

      new ButtonComponent(actionsEl)
        .setButtonText('View Diff')
        .onClick(() => {
          this.showDiff(entry);
        });

      new ButtonComponent(actionsEl)
        .setButtonText('Revert')
        .setWarning()
        .onClick(() => {
          this.resolvePromise({ action: 'revert', entry });
          this.close();
        });
    }

    const buttonContainer = contentEl.createDiv({ cls: 'mutare-buttons' });
    new ButtonComponent(buttonContainer)
      .setButtonText('Close')
      .onClick(() => {
        this.resolvePromise({ action: 'close' });
        this.close();
      });
  }

  private showDiff(entry: EditHistoryEntry) {
    const diffModal = new Modal(this.app);
    diffModal.onOpen = () => {
      const { contentEl } = diffModal;
      contentEl.empty();
      contentEl.addClass('mutare-diff-modal');

      contentEl.createEl('h2', { text: 'Changes Made' });
      contentEl.createEl('p', { text: `Instruction: "${entry.instruction}"` });

      const diffContainer = contentEl.createDiv({ cls: 'mutare-diff-container' });

      const beforeEl = diffContainer.createDiv({ cls: 'mutare-diff-pane' });
      beforeEl.createEl('h4', { text: 'Before' });
      beforeEl.createEl('pre', { text: entry.beforeContent, cls: 'mutare-diff-content' });

      const afterEl = diffContainer.createDiv({ cls: 'mutare-diff-pane' });
      afterEl.createEl('h4', { text: 'After' });
      afterEl.createEl('pre', { text: entry.afterContent, cls: 'mutare-diff-content' });

      const buttonContainer = contentEl.createDiv({ cls: 'mutare-buttons' });
      new ButtonComponent(buttonContainer)
        .setButtonText('Close')
        .onClick(() => diffModal.close());
    };
    diffModal.open();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
