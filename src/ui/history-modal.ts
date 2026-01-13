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

    // History is already sorted newest-first (unshift in saveToHistory)
    for (const entry of this.history) {
      const itemEl = listEl.createDiv({ cls: 'mutare-history-item' });

      const infoEl = itemEl.createDiv({ cls: 'mutare-history-info' });

      const date = new Date(entry.timestamp);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const relativeTime = this.getRelativeTime(date);

      infoEl.createEl('div', {
        text: entry.notePath.split('/').pop() || entry.notePath,
        cls: 'mutare-history-note',
      });
      infoEl.createEl('div', {
        text: `"${entry.instruction.substring(0, 50)}${entry.instruction.length > 50 ? '...' : ''}"`,
        cls: 'mutare-history-instruction',
      });
      infoEl.createEl('div', {
        text: `${relativeTime} (${dateStr}, ${timeStr}) • ${entry.editsApplied} edits`,
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

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
