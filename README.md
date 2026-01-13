# Mutare

**Autonomous LLM-powered note editing for Obsidian.**

*Mutare* (Latin: "to change") lets you describe what you want changed in your note, and an AI makes it happen. No more manual find-and-replace or tedious reformatting—just tell the AI what to do.

<p align="center">
  <img src="assets/logo-256.png" alt="Mutare Logo" width="128" />
</p>

## How It Works

1. Open any note in Obsidian
2. Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux) to open the command palette
3. Type "Mutare" to see available commands
4. Describe what you want: *"Fix typos"*, *"Convert to bullet points"*, *"Add a summary"*
5. Review the proposed changes in a preview modal
6. Click **Apply** to make the edits

> **Tip:** For even faster access, set up hotkeys in Settings → Hotkeys → search "Mutare"

Under the hood, Mutare:
- Sends your note content with line numbers to an LLM
- Receives structured edit instructions (which lines to replace, insert, or delete)
- Applies edits precisely using Obsidian's Editor API

## Features

- **Three commands** for different workflows:
  - `Mutare: Edit note` — Opens a prompt for custom instructions
  - `Mutare: Edit with selection` — Uses selected text as the instruction
  - `Mutare: Auto-improve` — Automatically fixes typos, grammar, and clarity

- **Multi-provider support**:
  - Anthropic Claude (claude-sonnet-4-5, claude-haiku-4-5, claude-opus-4-5)
  - OpenAI (gpt-5.2, gpt-5.1, gpt-4.1, gpt-4.1-mini)
  - Google Gemini (gemini-3-pro, gemini-3-flash, gemini-2.5-pro, gemini-2.5-flash)

- **Preview before applying** — See exactly what will change before committing

- **AI reasoning** — Understand *why* the AI made each change

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Settings → Community plugins
2. Search for "Mutare"
3. Install and enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/kaneda2004/Mutare-for-Obsidian/releases)
2. Create a folder: `YOUR_VAULT/.obsidian/plugins/mutare/`
3. Copy the three files into that folder
4. Enable the plugin in Obsidian settings

## Configuration

Go to **Settings → Mutare** to configure:

| Setting | Description |
|---------|-------------|
| **AI Provider** | Choose Anthropic, OpenAI, or Gemini |
| **API Keys** | Enter your API key for each provider |
| **Model** | Select which model to use per provider |
| **Confirm before applying** | Show preview modal (recommended) |
| **Show AI reasoning** | Display the AI's explanation for changes |
| **Custom system prompt** | Add your own instructions to the AI |

## Usage Examples

### Fix Writing Issues
> "Fix any typos, grammar issues, and improve clarity"

### Restructure Content
> "Convert this to a bulleted list with headers"

### Add Content
> "Add a TL;DR summary at the top"

### Task Management
> "Mark all completed items with [x] and add timestamps"

### Formatting
> "Format this as a table with columns for Name, Date, and Status"

## How Edits Work

Mutare uses a structured approach to ensure reliable edits:

```
Note with line numbers:        LLM returns:
   0 | # My Note               { "edits": [
   1 |                           {"line": 2, "action": "replace",
   2 | - [ ] Task one              "content": "- [x] Task one"},
   3 | - [x] Task two            {"line": 4, "action": "insert",
   4 |                              "content": "## Completed"}
                                ]}
```

Edits are applied **bottom-up** (highest line number first) to preserve line number accuracy.

## Requirements

- Obsidian v1.0.0 or higher
- An API key from at least one supported provider:
  - [Anthropic Console](https://console.anthropic.com/)
  - [OpenAI Platform](https://platform.openai.com/)
  - [Google AI Studio](https://aistudio.google.com/)

## Privacy & Security

- Your notes are sent to the AI provider you select
- API keys are stored locally in your vault's plugin data
- No data is collected or sent anywhere except to your chosen AI provider
- Consider using a local LLM provider if privacy is critical (future feature)

## Development

```bash
# Clone the repo
git clone https://github.com/kaneda2004/Mutare-for-Obsidian.git
cd mutare

# Install dependencies
npm install

# Build for development (with watch mode)
npm run dev

# Build for production
npm run build
```

### Project Structure

```
mutare/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── types.ts             # TypeScript types & Zod schemas
│   ├── settings.ts          # Settings tab
│   ├── providers/           # LLM provider implementations
│   │   ├── base.ts          # Abstract provider class
│   │   ├── anthropic.ts     # Anthropic Claude
│   │   ├── openai.ts        # OpenAI GPT
│   │   └── gemini.ts        # Google Gemini
│   ├── editor/              # Editor utilities
│   │   ├── formatter.ts     # Line number formatting
│   │   └── applier.ts       # Edit application logic
│   ├── prompts/             # System prompts
│   └── ui/                  # Modal components
├── manifest.json            # Obsidian plugin manifest
├── styles.css               # Plugin styles
└── esbuild.config.mjs       # Build configuration
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with the [Obsidian Plugin API](https://docs.obsidian.md/)
- Uses [Zod](https://zod.dev/) for schema validation
- Inspired by AI coding assistants like Cursor and Claude Code

---

**Mutare** — *Let AI transform your notes.*
