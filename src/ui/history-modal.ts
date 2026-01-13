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

      // Before pane
      const beforeEl = diffContainer.createDiv({ cls: 'mutare-diff-pane' });
      beforeEl.createEl('h4', { text: 'Before' });
      const beforeContent = beforeEl.createDiv({ cls: 'mutare-diff-content' });
      this.renderDiffLines(beforeContent, entry.beforeContent, entry.afterContent, 'before');

      // After pane
      const afterEl = diffContainer.createDiv({ cls: 'mutare-diff-pane' });
      afterEl.createEl('h4', { text: 'After' });
      const afterContent = afterEl.createDiv({ cls: 'mutare-diff-content' });
      this.renderDiffLines(afterContent, entry.beforeContent, entry.afterContent, 'after');

      const buttonContainer = contentEl.createDiv({ cls: 'mutare-buttons' });
      new ButtonComponent(buttonContainer)
        .setButtonText('Close')
        .onClick(() => diffModal.close());
    };
    diffModal.open();
  }

  private renderDiffLines(container: HTMLElement, before: string, after: string, side: 'before' | 'after') {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');

    // Simple line-by-line diff
    const maxLines = Math.max(beforeLines.length, afterLines.length);
    const lines = side === 'before' ? beforeLines : afterLines;
    const otherLines = side === 'before' ? afterLines : beforeLines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const otherLine = otherLines[i];
      const lineEl = container.createDiv({ cls: 'mutare-diff-line' });

      // Line number
      lineEl.createSpan({ text: String(i + 1).padStart(3, ' '), cls: 'mutare-diff-linenum' });

      // Determine if line was added, removed, or changed
      if (side === 'before') {
        if (i >= afterLines.length || line !== otherLine) {
          lineEl.addClass('mutare-diff-removed');
          lineEl.createSpan({ text: '- ', cls: 'mutare-diff-marker' });
        } else {
          lineEl.createSpan({ text: '  ', cls: 'mutare-diff-marker' });
        }
      } else {
        if (i >= beforeLines.length || line !== otherLine) {
          lineEl.addClass('mutare-diff-added');
          lineEl.createSpan({ text: '+ ', cls: 'mutare-diff-marker' });
        } else {
          lineEl.createSpan({ text: '  ', cls: 'mutare-diff-marker' });
        }
      }

      lineEl.createSpan({ text: line || ' ', cls: 'mutare-diff-text' });
    }
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
