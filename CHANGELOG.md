# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

## [1.0.0] - 2024-XX-XX

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
