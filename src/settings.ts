import { App, PluginSettingTab, Setting } from 'obsidian';
import MutarePlugin from './main';
import { ProviderType, PROVIDER_MODELS, PROVIDER_NAMES } from './types';

export class MutareSettingTab extends PluginSettingTab {
  plugin: MutarePlugin;

  constructor(app: App, plugin: MutarePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Mutare Settings' });

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
    containerEl.createEl('h3', { text: 'API Keys' });

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
          text.inputEl.style.width = '300px';
        });
    }

    // Model Selection Section
    containerEl.createEl('h3', { text: 'Model Selection' });

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
    containerEl.createEl('h3', { text: 'Behavior' });

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
    containerEl.createEl('h3', { text: 'Custom Instructions' });

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
        text.inputEl.style.width = '100%';
      });
  }
}
