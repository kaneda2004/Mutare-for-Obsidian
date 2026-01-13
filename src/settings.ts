import { App, PluginSettingTab, Setting } from 'obsidian';
import MutarePlugin from './main';
import { ProviderType, PROVIDER_MODELS, PROVIDER_NAMES, SavedPrompt, DEFAULT_PROMPTS } from './types';

export class MutareSettingTab extends PluginSettingTab {
  plugin: MutarePlugin;

  constructor(app: App, plugin: MutarePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('Mutare settings').setHeading();

    // Provider Selection
    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Select which AI provider to use for editing')
      .addDropdown(dropdown => {
        const providers: ProviderType[] = ['anthropic', 'openai', 'gemini'];
        for (const p of providers) {
          dropdown.addOption(p, PROVIDER_NAMES[p]);
        }
        dropdown
          .setValue(this.plugin.settings.provider)
          .onChange(async (value: string) => {
            this.plugin.settings.provider = value as ProviderType;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show relevant model options
          });
      });

    // API Keys Section
    new Setting(containerEl).setName('API keys').setHeading();

    const providers: ProviderType[] = ['anthropic', 'openai', 'gemini'];

    for (const provider of providers) {
      new Setting(containerEl)
        .setName(`${PROVIDER_NAMES[provider]} API Key`)
        .setDesc(`Enter your ${PROVIDER_NAMES[provider]} API key`)
        .addText(text => {
          text
            .setPlaceholder('Enter API key...')
            .setValue(this.plugin.settings.apiKeys[provider])
            .onChange(async (value) => {
              this.plugin.settings.apiKeys[provider] = value;
              await this.plugin.saveSettings();
            });
          text.inputEl.type = 'password';
          text.inputEl.addClass('mutare-input-medium');
        });
    }

    // Model Selection Section
    new Setting(containerEl).setName('Model selection').setHeading();

    for (const provider of providers) {
      new Setting(containerEl)
        .setName(`${PROVIDER_NAMES[provider]} Model`)
        .setDesc(`Select the ${PROVIDER_NAMES[provider]} model to use`)
        .addDropdown(dropdown => {
          for (const model of PROVIDER_MODELS[provider]) {
            dropdown.addOption(model, model);
          }
          dropdown
            .setValue(this.plugin.settings.models[provider])
            .onChange(async (value) => {
              this.plugin.settings.models[provider] = value;
              await this.plugin.saveSettings();
            });
        });
    }

    // Behavior Section
    new Setting(containerEl).setName('Behavior').setHeading();

    new Setting(containerEl)
      .setName('Confirm before applying')
      .setDesc('Show a preview of changes before applying them')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.confirmBeforeApply)
          .onChange(async (value) => {
            this.plugin.settings.confirmBeforeApply = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Show AI reasoning')
      .setDesc("Display the AI's reasoning in the preview modal")
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.showReasoning)
          .onChange(async (value) => {
            this.plugin.settings.showReasoning = value;
            await this.plugin.saveSettings();
          });
      });

    // Custom Prompt Section
    new Setting(containerEl).setName('Custom instructions').setHeading();

    new Setting(containerEl)
      .setName('Additional system prompt')
      .setDesc('Add custom instructions that will be appended to the default system prompt')
      .addTextArea(text => {
        text
          .setPlaceholder('e.g., "Always use bullet points for lists"')
          .setValue(this.plugin.settings.customSystemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.customSystemPrompt = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
        text.inputEl.addClass('mutare-input-full');
      });

    // Saved Prompts Section
    new Setting(containerEl)
      .setName('Quick prompts')
      .setDesc('Manage your quick prompts for common editing tasks.')
      .setHeading();

    // Render existing prompts
    const promptsContainer = containerEl.createDiv({ cls: 'mutare-prompts-container' });
    for (let i = 0; i < this.plugin.settings.savedPrompts.length; i++) {
      const prompt = this.plugin.settings.savedPrompts[i];
      this.renderPromptItem(promptsContainer, prompt, i);
    }

    // Add new prompt button
    new Setting(containerEl)
      .addButton(button => {
        button
          .setButtonText('Add New Prompt')
          .setCta()
          .onClick(async () => {
            const newPrompt: SavedPrompt = {
              id: `custom-${Date.now()}`,
              name: 'New Prompt',
              prompt: '',
            };
            this.plugin.settings.savedPrompts.push(newPrompt);
            await this.plugin.saveSettings();
            this.display(); // Refresh
          });
      });

    // Reset to defaults
    new Setting(containerEl)
      .setName('Reset prompts')
      .setDesc('Restore the default prompts (custom prompts will be lost)')
      .addButton(button => {
        button
          .setButtonText('Reset to Defaults')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.savedPrompts = [...DEFAULT_PROMPTS];
            await this.plugin.saveSettings();
            this.display();
          });
      });
  }

  private renderPromptItem(container: HTMLElement, prompt: SavedPrompt, index: number) {
    const itemEl = container.createDiv({ cls: 'mutare-prompt-item' });

    // Name input
    new Setting(itemEl)
      .setName('Name')
      .addText(text => {
        text
          .setValue(prompt.name)
          .setPlaceholder('Prompt name')
          .onChange(async (value) => {
            this.plugin.settings.savedPrompts[index].name = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.addClass('mutare-input-medium');
      });

    // Prompt input
    new Setting(itemEl)
      .setName('Prompt')
      .addTextArea(text => {
        text
          .setValue(prompt.prompt)
          .setPlaceholder('Enter the instruction...')
          .onChange(async (value) => {
            this.plugin.settings.savedPrompts[index].prompt = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 2;
        text.inputEl.addClass('mutare-input-full');
      });

    // Delete button
    new Setting(itemEl)
      .addButton(button => {
        button
          .setButtonText('Delete')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.savedPrompts.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          });
      });
  }
}
