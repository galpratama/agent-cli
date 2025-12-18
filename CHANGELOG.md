# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-18

### Added

#### Cross-Platform Support

- **Linux support** - Native support for Linux distributions
- **Windows support via WSL2** - Full functionality through Windows Subsystem for Linux
- Cross-platform home directory expansion using Node's `homedir()`
- Platform-aware PATH separator handling

#### Provider Configuration TUI (`agent config`)

- Interactive TUI for managing providers
- Add, edit, delete, and view providers
- Toggle enable/disable providers
- Real-time validation status display
- Keyboard navigation with vim-style shortcuts

#### Enhanced Provider Categories

- Added 10 new categories: `openai`, `google`, `meta`, `mistral`, `cohere`, `azure`, `amazon`, `opensource`, `enterprise`, `custom`
- Total of 14 categories for better organization

#### Agent Selector Improvements

**Navigation & Filtering:**

- **Fuzzy search** (`/`) - Typo-tolerant search across name, ID, description, aliases, and tags
- **Category filter** (`Ctrl+1-9`) - Quick filter by provider category
- **Valid only filter** (`v`) - Toggle to show only available providers
- **Auto-select last used** - Cursor starts on your last used provider

**Organization:**

- **Pin providers** (`p`) - Pin important providers to the top of the list
- **Sort modes** (`s`) - Cycle through Name, Usage Count, Last Used, Category
- **Usage stats display** - Shows usage count next to each provider

**Information:**

- **Help overlay** (`?`) - Full keyboard shortcuts reference
- **Provider details panel** (`i`) - Shows complete provider info including:
  - Validation status with detailed error messages
  - Usage statistics
  - Environment variables
  - Tags and aliases
  - Configuration directory

**Actions:**

- **Quick refresh** (`r`) - Re-validate all providers
- **Copy to clipboard** (`C`) - Copy provider ID for scripting
- **Open config** (`e`) - Jump to provider configuration TUI

#### New Config Features

- **Pinned providers** - Pin providers to always appear at top
- **Provider aliases** - Create custom short names for providers
- **Custom tags** - Tag providers for custom grouping and search

### Changed

- Moved recently used indicator (↺) to appear after provider name
- Favorite indicator (★) remains in separate column
- Updated Footer component with new keyboard shortcuts
- Changed category grouping shortcut from `t` to `T`
- Disabled mouse click (kept scroll for navigation)

### Fixed

- macOS Keychain bypass now only runs on macOS (not Linux/Windows)
- Home directory expansion works correctly on all platforms
- PATH separator uses correct character per platform (`:` on Unix, `;` on Windows)

## [1.0.0] - 20245-12-18

### Added

#### Core Features

- Interactive TUI for selecting and launching AI providers
- Support for multiple provider types:
  - **Anthropic**: Claude (default), Foundry Azure
  - **Chinese AI**: GLM, Kimi, MiniMax
  - **Standalone CLIs**: Codex, Vibe, OpenCode, Gemini, Kilo, Qwen
- Beautiful ASCII art header with gradient colors
- Real-time provider status validation

#### Navigation & Controls

- Keyboard navigation with arrow keys and Vim-style (j/k) bindings
- Quick number selection (1-9, 0 for positions 1-10)
- Search functionality with `/` key
- Mouse support (click, double-click, scroll)
- Category grouping toggle with `t` key

#### Provider Management

- Provider configuration via `~/.agent-cli/providers.json`
- JSON Schema validation for provider configuration
- Enable/disable providers
- Custom provider support
- Provider override settings
- Three validation types: env, http, command

#### Session Management

- Session history tracking (last 50 sessions)
- Usage statistics by provider
- Last used provider quick launch
- Favorite providers with `f` key toggle

#### Profile System

- Save profiles with custom configurations
- Launch saved profiles quickly
- Profile management commands (save, list, delete)

#### CLI Commands

- `agent` - Interactive provider selection
- `agent <provider>` - Direct provider launch
- `agent list` - List all providers with status
- `agent check` - Validate provider configurations
- `agent last` - Launch last used provider
- `agent history` - Show session history
- `agent stats` - Show usage statistics
- `agent profile` - Profile management
- `agent providers` - Provider configuration management
- `agent setup` - Interactive setup wizard
- `agent update` - Self-update command
- `agent update-tools` - Update standalone AI CLI tools

#### Options & Flags

- `--continue` - Resume last Claude session
- `--dangerously-skip-permissions` - Skip permission prompts
- `--fallback` - Auto-fallback to next provider on failure

#### Developer Experience

- TypeScript support with strict mode
- React/Ink-based terminal UI
- Modular component architecture
- Comprehensive type definitions

### Technical Details

- Built with React 18 and Ink 5
- Commander.js for CLI argument parsing
- Chalk for terminal styling
- Conf for persistent configuration storage
- ES2022 target with NodeNext modules

---

## Version History Format

Each version entry includes:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

[Unreleased]: https://github.com/galpratama/agent-cli/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/galpratama/agent-cli/releases/tag/v1.0.0
