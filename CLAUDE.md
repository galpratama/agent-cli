# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent CLI is a terminal UI (TUI) application for launching multiple AI CLI providers (Claude, Codex, Gemini, etc.) from a unified interface. It provides provider isolation, session management, and auto-fallback capabilities.

## Development Commands

```bash
npm run dev          # Run in development mode (tsx src/cli.tsx)
npm run watch        # Watch mode for TypeScript compilation
npm run build        # Build for production (tsc)
npm run link         # Build and link globally for testing
npm start            # Run the built version (node dist/cli.js)
```

**Testing changes:**
```bash
npm run build && agent --help    # Verify CLI works
agent list                       # Test provider listing
agent check                      # Test provider validation
```

## Architecture

### Tech Stack
- **React + Ink**: Terminal UI framework (React renderer for CLI)
- **Commander.js**: CLI argument parsing and subcommands
- **TypeScript**: Strict mode enabled, ES2022 target
- **Conf**: User preferences storage

### Directory Structure

```
src/
├── cli.tsx                  # Entry point - Commander.js commands + Ink rendering
├── components/              # React/Ink UI components
│   ├── App.tsx              # Main app - state machine (selecting → launching → launched)
│   ├── ProviderList.tsx     # Interactive list with keyboard/mouse support
│   ├── ProviderConfigApp.tsx # TUI for managing provider configuration
│   └── ...                  # Header, Footer, StatusBadge, ProviderItem
└── lib/                     # Core logic
    ├── providers.ts         # Type definitions (Provider, ProviderCategory)
    ├── provider-config.ts   # Config CRUD for ~/.agent-cli/providers.json
    ├── launcher.ts          # Process spawning with env isolation
    ├── validate.ts          # Provider availability checks (env/http/command)
    └── config.ts            # User prefs (profiles, sessions, stats)
```

### Key Data Flow

1. **Provider loading**: `provider-config.ts` reads `~/.agent-cli/providers.json` (initialized from `providers.example.json`)
2. **Validation**: `validate.ts` checks if providers are available (env vars set, commands exist)
3. **Launching**: `launcher.ts` spawns the provider CLI with isolated `CLAUDE_CONFIG_DIR` and custom env vars
4. **Fallback**: On failure, tries next provider in same category

### Provider Types

| Type | Description |
|------|-------------|
| `api` | Uses Claude CLI with custom `ANTHROPIC_BASE_URL` |
| `standalone` | Independent CLI (codex, gemini, vibe) - uses `provider.command` |

### Environment Isolation

Each provider gets isolated configuration via:
- `CLAUDE_CONFIG_DIR` set to provider's `configDir`
- Provider-specific `envVars` applied
- `envMappings` to map user's env vars to provider-expected vars

On macOS, a fake `security` command is injected to bypass Keychain (forces file-based credential storage).

## Coding Guidelines

- Use functional React components with hooks
- Follow Conventional Commits: `feat(scope): description`
- Provider IDs must be lowercase alphanumeric with hyphens only
- Use `.js` extension in imports (ES modules)
- Keep lines under 100 characters

## Adding a New Provider

1. Add to `providers.example.json` with required fields: `id`, `name`, `type`, `category`, `validation`
2. For standalone CLIs, include: `command`, `validation.type: "command"`, optionally `updateCmd`
3. Test: `agent check`, `agent list`, `agent <new-provider>`
