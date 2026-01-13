import { App, Modal, ButtonComponent, TextAreaComponent } from 'obsidian';

export interface InstructionModalResult {
  instruction: string | null;
}

export class InstructionModal extends Modal {
  private resolvePromise: ((result: InstructionModalResult) => void) | null = null;
  private instruction: string = '';

  constructor(app: App) {
    super(app);
  }

  async waitForResult(): Promise<InstructionModalResult> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    modalEl.addClass('mutare-instruction-modal');

    // Title
    contentEl.createEl('h2', { text: 'Mutare: Edit Note' });

    // Description
    contentEl.createEl('p', {
      text: 'Describe what changes you want the AI to make to your note:',
      cls: 'mutare-instruction-desc',
    });

    // Text area for instruction
    const textAreaContainer = contentEl.createDiv({ cls: 'mutare-textarea-container' });
    const textArea = new TextAreaComponent(textAreaContainer);
    textArea
      .setPlaceholder('e.g., "Fix typos and grammar", "Convert to bullet points", "Add a summary section"...')
      .onChange((value) => {
        this.instruction = value;
      });
    textArea.inputEl.rows = 4;
    textArea.inputEl.style.width = '100%';
    textArea.inputEl.focus();

    // Handle Enter key (Ctrl/Cmd + Enter to submit)
    textArea.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.submit();
      }
    });

    // Hint
    contentEl.createEl('p', {
      text: 'Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to submit',
      cls: 'mutare-hint',
    });

    // Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'mutare-buttons' });

    new ButtonComponent(buttonContainer)
      .setButtonText('Cancel')
      .onClick(() => {
        if (this.resolvePromise) {
          this.resolvePromise({ instruction: null });
        }
        this.close();
      });

    new ButtonComponent(buttonContainer)
      .setButtonText('Edit Note')
      .setCta()
      .onClick(() => {
        this.submit();
      });
  }

  private submit() {
    if (this.resolvePromise) {
      const instruction = this.instruction.trim();
      this.resolvePromise({ instruction: instruction || null });
    }
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    // Ensure promise is resolved if modal is closed another way
    if (this.resolvePromise) {
      this.resolvePromise({ instruction: null });
      this.resolvePromise = null;
    }
  }
}
