---
name: New Provider Request
about: Request support for a new AI provider
title: '[Provider] Add support for '
labels: enhancement, provider
assignees: ''
---

## Provider Information

- **Provider Name**: [e.g., OpenRouter, Together AI]
- **Provider Website**: [URL]
- **API Documentation**: [URL to API docs]

## Provider Type

- [ ] API (uses Claude CLI with custom endpoint)
- [ ] Standalone CLI (independent CLI tool)
- [ ] Proxy/Gateway

## Technical Details

### For API Providers

- **Base URL**: `https://api.example.com/v1`
- **Authentication**: [e.g., Bearer token, API key header]
- **Environment Variable**: [e.g., `PROVIDER_API_KEY`]

### For Standalone CLI Providers

- **CLI Command**: [e.g., `provider-cli`]
- **Installation**: [e.g., `npm install -g provider-cli`]
- **Update Command**: [e.g., `npm update -g provider-cli`]

## Proposed Configuration

```json
{
  "id": "provider-name",
  "name": "Provider Name",
  "description": "Short description",
  "icon": "🤖",
  "type": "api",
  "category": "standalone",
  "configDir": "~/.provider-name",
  "envVars": {
    "ANTHROPIC_BASE_URL": "https://api.example.com"
  },
  "envMappings": {
    "PROVIDER_API_KEY": "ANTHROPIC_API_KEY"
  },
  "validation": {
    "type": "env",
    "envKey": "PROVIDER_API_KEY"
  }
}
```

## Why This Provider?

Explain why this provider would be valuable to add:

- Unique features
- Target audience
- Popularity/adoption

## Additional Context

Add any other context about the provider request here.

## Checklist

- [ ] I have verified the provider has a compatible API or CLI
- [ ] I have tested the provider manually (if possible)
- [ ] I am willing to help implement and test this provider (optional)
