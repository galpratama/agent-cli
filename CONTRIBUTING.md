# Contributing to Agent CLI

First off, thank you for considering contributing to Agent CLI! It's people like you that make Agent CLI such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Adding New Providers](#adding-new-providers)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive environment. By participating, you are expected to uphold this standard. Please report unacceptable behavior to the project maintainers.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your changes
5. Make your changes
6. Test your changes
7. Submit a pull request

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (commands, configuration, etc.)
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the proposed enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Adding New Providers

We welcome contributions that add support for new AI providers! See the [Adding New Providers](#adding-new-providers) section below.

### Improving Documentation

Documentation improvements are always welcome. This includes:

- Fixing typos or unclear explanations
- Adding examples
- Improving the README
- Adding JSDoc comments to code

### Code Contributions

Look for issues labeled `good first issue` or `help wanted` to get started.

## Development Setup

### Prerequisites

- Node.js >= 18
- npm or yarn
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/agent-cli.git
cd agent-cli

# Add upstream remote
git remote add upstream https://github.com/galpratama/agent-cli.git

# Install dependencies
npm install

# Build the project
npm run build

# Link for local testing
npm link
```

### Development Commands

```bash
# Run in development mode (with hot reload)
npm run dev

# Watch mode for TypeScript compilation
npm run watch

# Build for production
npm run build

# Run the built version
npm start
```

### Testing Your Changes

Before submitting a PR, ensure:

1. The project builds without errors: `npm run build`
2. The CLI runs correctly: `agent --help`
3. Your changes work as expected: `agent list`, `agent check`, etc.

## Project Structure

```
agent-cli/
├── src/
│   ├── cli.tsx              # Main CLI entry point with Commander.js
│   ├── components/          # React/Ink UI components
│   │   ├── App.tsx          # Main application component
│   │   ├── Header.tsx       # ASCII art header
│   │   ├── Footer.tsx       # Keyboard shortcuts display
│   │   ├── ProviderList.tsx # Interactive provider list
│   │   ├── ProviderItem.tsx # Individual provider item
│   │   └── StatusBadge.tsx  # Status indicator component
│   └── lib/                 # Core library code
│       ├── providers.ts     # Provider type definitions
│       ├── provider-config.ts # Configuration management
│       ├── launcher.ts      # Provider launching logic
│       ├── validate.ts      # Provider validation
│       ├── config.ts        # User preferences (conf)
│       └── useMouse.ts      # Mouse event handling
├── providers.example.json   # Example provider configuration
├── providers.schema.json    # JSON Schema for validation
├── package.json
└── tsconfig.json
```

### Key Files

| File | Purpose |
|------|---------|
| `src/cli.tsx` | CLI commands, argument parsing, main entry point |
| `src/components/App.tsx` | Main React component, state management |
| `src/lib/launcher.ts` | Spawns provider processes with environment setup |
| `src/lib/provider-config.ts` | Loads/saves provider configuration |
| `src/lib/validate.ts` | Validates provider availability |

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define interfaces for all data structures
- Use meaningful variable and function names

### React/Ink Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line arrays/objects
- Keep lines under 100 characters when possible

### Example

```typescript
// Good
interface ProviderConfig {
  id: string;
  name: string;
  description?: string;
}

const validateProvider = async (provider: ProviderConfig): Promise<boolean> => {
  // Implementation
};

// Avoid
function validateProvider(provider) {
  // Missing types
}
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(providers): add support for OpenRouter API
fix(launcher): handle spaces in config directory path
docs(readme): add troubleshooting section
refactor(validate): simplify HTTP validation logic
```

## Pull Request Process

1. **Update your fork**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow the coding guidelines
   - Test your changes thoroughly

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots for UI changes

7. **Address review feedback**
   - Respond to all comments
   - Make requested changes
   - Push additional commits as needed

### PR Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] Changes are tested and working
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventions
- [ ] PR description explains the changes

## Adding New Providers

To add a new AI provider:

### 1. Define the Provider Configuration

Add the provider to `providers.example.json`:

```json
{
  "id": "new-provider",
  "name": "New Provider",
  "description": "Description of the provider",
  "icon": "🤖",
  "type": "api",
  "category": "standalone",
  "configDir": "~/.new-provider",
  "envVars": {
    "ANTHROPIC_BASE_URL": "https://api.newprovider.com"
  },
  "envMappings": {
    "NEW_PROVIDER_API_KEY": "ANTHROPIC_API_KEY"
  },
  "validation": {
    "type": "env",
    "envKey": "NEW_PROVIDER_API_KEY"
  }
}
```

### 2. Provider Types

| Type | Description |
|------|-------------|
| `api` | Uses Claude CLI with custom API endpoint |
| `proxy` | Proxies requests through a gateway |
| `gateway` | API gateway service |
| `standalone` | Independent CLI tool |

### 3. Validation Types

| Type | Description |
|------|-------------|
| `env` | Check if environment variable is set |
| `http` | Check if URL is reachable |
| `command` | Check if command exists in PATH |

### 4. For Standalone Providers

If adding a standalone CLI tool:

```json
{
  "id": "new-cli",
  "name": "New CLI",
  "type": "standalone",
  "category": "standalone",
  "command": "new-cli",
  "defaultArgs": ["--some-flag"],
  "validation": {
    "type": "command",
    "command": "new-cli"
  },
  "updateCmd": ["npm", "update", "-g", "new-cli-package"]
}
```

### 5. Testing Your Provider

1. Add the provider to your local `~/.agent-cli/providers.json`
2. Run `agent check` to verify validation works
3. Run `agent list` to see the provider
4. Test launching with `agent new-provider`

### 6. Submit Your PR

Include in your PR:
- Provider configuration in `providers.example.json`
- Setup instructions in the README (if needed)
- Any required code changes

## Questions?

If you have questions about contributing, feel free to:

- Open an issue with the `question` label
- Start a discussion in GitHub Discussions

Thank you for contributing to Agent CLI!
