# Contributing to ERPNext MCP Server

We love your input! We want to make contributing to ERPNext MCP Server as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/ravanosmcp.git
cd ravanosmcp

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing
- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Group related tests using `describe` blocks

### Code Style
- Follow the existing ESLint configuration
- Use Prettier for code formatting
- Keep functions small and focused
- Use async/await over promises

### Commit Messages
Follow the [Conventional Commits](https://conventionalcommits.org/) specification:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` code style changes (formatting, etc.)
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks

Examples:
```
feat: add sales quotation management
fix: handle missing employee records in HR pack
docs: update installation guide
test: add integration tests for workflow operations
```

## Issue Reporting

We use GitHub issues to track public bugs. Report a bug by opening a new issue.

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We welcome feature requests! Please:

1. Check if the feature has already been requested
2. Provide a clear description of the feature
3. Explain the use case and benefits
4. Consider providing a basic implementation plan

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to reach out:
- Open a [Discussion](https://github.com/Ravana-indus/ravanosmcp/discussions)
- Email us at support@ravanos.com
- Check our [Documentation](./docs/)

Thank you for contributing! 🎉