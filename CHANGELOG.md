# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-20

### Added

- **Multi-model provider support** - Providers can now define multiple models that users can select before launching
  - New `models` array field in provider configuration for listing available models
  - New `modelEnvVar` field to specify which environment variable controls model selection
  - Interactive model picker UI appears after selecting a multi-model provider
  - Last used model is remembered per provider and auto-selected on next launch
  - Keyboard navigation in model picker: arrows/vim keys, fuzzy search (`/`), Esc to go back
- **MegaLLM models** - Added 16 models to MegaLLM provider including DeepSeek, Qwen, Llama, Mistral, and more
- **OpenRouter provider** - Access multiple AI models via OpenRouter's unified API
  - Uses `OPENROUTER_API_KEY` environment variable
  - Maps to Claude CLI's authentication system
- **MegaLLM provider** - Access various AI models with model selection support
  - Uses `MEGALLM_API_KEY` environment variable
  - Includes 16+ models: DeepSeek V3.2, Qwen 3 Coder, Llama 3.3, Mistral Large 3, and more
- **New provider categories** - Added `openrouter` and `megallm` to category types and labels

### Changed

- App state machine now includes `selecting-model` state for the two-step provider → model flow
- Launcher now accepts optional `model` parameter and sets the appropriate environment variable
- Provider schema updated to include all category types and new model-related fields

## [1.1.5] - 2025-12-19

### Added

- **Fullscreen TUI mode** - The interactive UI now uses the terminal's alternate screen buffer for a true fullscreen experience
- **Responsive terminal resizing** - UI adapts dynamically when the terminal window is resized
- **Update command for Claude** - Claude provider now supports `u` key to run `claude update`
- **Universal update support** - Any provider with `updateCmd` configured can now be updated (not just standalone CLIs)

### Fixed

- **Virtual scrolling display issues** - Scroll indicators now have reserved space, preventing items from being hidden
- **Empty updateCmd crash** - Fixed `ERR_INVALID_ARG_TYPE` error when pressing `u` on providers with empty `updateCmd` array
- **Help/details overlay keyboard handling** - Any key now closes overlays (more intuitive UX)

### Changed

- **Simplified keyboard shortcuts** - Removed `T` (group by category) and `C` (copy ID) shortcuts that weren't working well with virtual scrolling
- **Footer layout** - Reordered shortcuts to show Update (`u`) after Refresh (`r`)

### Removed

- **Group by category feature** - Inline category headers broke virtual scrolling layout; sort by category still works via `s` key
- **Copy ID shortcut** - Removed `C` shortcut and clipboard functionality

## [1.1.4] - 2025-12-18

### Added

- **Skip-permissions support for standalone CLIs** - The `-y, --dangerously-skip-permissions` flag now works with standalone AI CLIs, not just Claude:
  - **Codex**: `--full-auto` (sandboxed automatic execution)
  - **Gemini**: `--yolo` (auto-approve all actions)
  - **Vibe**: `--auto-approve` (auto-approve tool executions)
  - **Kilo**: `--yolo` (auto-approve tool permissions)
  - **Qwen**: `--yolo` (auto-approve all actions)
- **Continue/resume support for standalone CLIs** - The `-c, --continue` flag now works with standalone CLIs:
  - All standalone CLIs now have `continueArg` configured
  - Codex uses `resume --last`, others use `--continue`

### Changed

- Updated CLI help text: `-y` flag description changed from "Claude only" to "auto-approve mode"
- Fixed Gemini update command to use correct package `@google/gemini-cli`
- Fixed Qwen update command to use correct package `@anthropic-ai/qwen-code`

## [1.1.3] - 2025-12-18

### Fixed

- **Session tracking now works in all launch methods** - Previously, `recordUsage()` and `addSession()` were only called when launching via profiles. Now session history and usage statistics are properly tracked when:
  - Launching directly via `agent <provider>`
  - Selecting a provider in the interactive TUI
  - Launching via `agent last` command
- Usage statistics (`agent stats`) now populate correctly
- Session history (`agent history`) now records all launches

## [1.1.2] - 2025-12-18

### Performance

- **Memoized ProviderItem component** - Prevents unnecessary re-renders when parent state changes
- **Pre-computed alias and tags maps** - O(1) lookups instead of recreating maps on every filter
- **Optimized fuzzy search** - Added early exit conditions and uses `charCodeAt` for faster comparison
- **Validation result caching** - 5-minute TTL cache reduces redundant validation calls
- **Fast path in search filter** - Checks ID and name first before description/alias/tags

## [1.1.1] - 2025-12-18

### Fixed

- Escape key now works properly in help overlay and details panel
- Added `q` key as alternative to close help overlay and details panel
- Escape key now shows status message when clearing filters

## [1.1.0] - 2025-12-18

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
