import { Notice } from 'obsidian';

export class StatusManager {
  private activeNotice: Notice | null = null;

  showProcessing(message: string = 'Processing with AI...') {
    this.dismiss();
    this.activeNotice = new Notice(message, 0); // 0 = don't auto-dismiss
  }

  showSuccess(message: string, timeout: number = 3000) {
    this.dismiss();
    new Notice(message, timeout);
  }

  showError(message: string, timeout: number = 5000) {
    this.dismiss();
    new Notice(`Error: ${message}`, timeout);
  }

  dismiss() {
    if (this.activeNotice) {
      this.activeNotice.hide();
      this.activeNotice = null;
    }
  }
}
