# Andamio T3 App Template - Documentation

> Map of Content (MOC) for the Andamio T3 App Template documentation.

This index organizes all documentation to help you find what you need quickly, whether you're an experienced contributor, newcomer, or AI agent.

---

## Quick Navigation

### For Newcomers
Start here to understand the project:
1. **[Getting Started Guide](../.claude/skills/project-manager/GETTING-STARTED.md)** - Setup instructions, pioneer program info
2. [Project Status](../.claude/skills/project-manager/STATUS.md) - Current implementation status
3. [Project Roadmap](../.claude/skills/project-manager/ROADMAP.md) - Development phases and planned features
4. [Responsive Design Guide](./styling/RESPONSIVE-DESIGN.md) - UI patterns and component usage
5. [Semantic Colors](./styling/SEMANTIC-COLORS.md) - Color system and theming

### For Experienced Contributors
Jump to specific topics:
- **Architecture**: [Data Sources](./architecture/DATA-SOURCES.md) | [Pending TX Architecture](./architecture/PENDING-TX-IMPROVEMENTS.md)
- **Components**: [Transaction Components](./components/TRANSACTION-COMPONENTS.md) | [Pending TX Popover](./components/PENDING-TX-POPOVER.md)
- **API**: [Endpoint Reference](./api/API-ENDPOINT-REFERENCE.md)
- **Patterns**: [Input Validation](./patterns/input-validation.md) | [Query Patterns](./patterns/query-patterns.md)

### For AI Agents
Structured overview for navigation:
- `project/` - Project status and roadmap (high-level context)
- `architecture/` - System design and data flow
- `components/` - Reusable component documentation
- `features/` - Feature-specific implementation guides
- `patterns/` - Code patterns and best practices
- `styling/` - UI styling and theming guides
- `api/` - API endpoint documentation
- `guides/` - Step-by-step implementation guides
- `reference/` - Technical reference documentation
- `sitemaps/` - Route and state documentation

---

## Documentation Categories

### Project (`.claude/skills/project-manager/`)

High-level project tracking and planning documentation (moved to Claude Skills).

| Document | Description | Audience |
|----------|-------------|----------|
| [STATUS.md](../.claude/skills/project-manager/STATUS.md) | Implementation status tracking | All |
| [ROADMAP.md](../.claude/skills/project-manager/ROADMAP.md) | Development roadmap with phases and decision log | All |
| [GETTING-STARTED.md](../.claude/skills/project-manager/GETTING-STARTED.md) | Setup guide for pioneers and developers | All |

### Architecture (`docs/architecture/`)

System design, data flow, and architectural decisions.

| Document | Description | Audience |
|----------|-------------|----------|
| [DATA-SOURCES.md](./architecture/DATA-SOURCES.md) | Overview of data sources - Database API, Andamioscan, Koios integration | Contributors |
| [PENDING-TX-IMPROVEMENTS.md](./architecture/PENDING-TX-IMPROVEMENTS.md) | Detailed comparison of old vs new pending transaction architecture | Contributors |
| [SIDE-EFFECTS-INTEGRATION.md](./architecture/SIDE-EFFECTS-INTEGRATION.md) | Transaction side effects system design and implementation | Contributors |

### Features (`docs/features/`)

Feature-specific implementation documentation.

| Document | Description | Audience |
|----------|-------------|----------|
| [PENDING-TX-WATCHER.md](./features/PENDING-TX-WATCHER.md) | Automatic transaction monitoring - setup, configuration, migration path | Contributors |

### Components (`docs/components/`)

Reusable UI component documentation.

| Document | Description | Audience |
|----------|-------------|----------|
| [PENDING-TX-POPOVER.md](./components/PENDING-TX-POPOVER.md) | Visual pending transaction indicator - usage, styling, accessibility | Contributors |
| [TRANSACTION-COMPONENTS.md](./components/TRANSACTION-COMPONENTS.md) | Transaction component patterns and integration | Contributors |

### Patterns (`docs/patterns/`)

Code patterns and best practices.

| Document | Description | Audience |
|----------|-------------|----------|
| [input-validation.md](./patterns/input-validation.md) | Input validation patterns for forms and API | Contributors |
| [query-patterns.md](./patterns/query-patterns.md) | Data fetching and query patterns | Contributors |

### Styling (`docs/styling/`)

UI styling, theming, and responsive design.

| Document | Description | Audience |
|----------|-------------|----------|
| [RESPONSIVE-DESIGN.md](./styling/RESPONSIVE-DESIGN.md) | **Comprehensive style guide** - breakpoints, Andamio components (PageHeader, SectionHeader, TableContainer), responsive patterns | All |
| [SEMANTIC-COLORS.md](./styling/SEMANTIC-COLORS.md) | Semantic color system - when to use which colors, adding new colors | All |

### API (`docs/api/`)

API endpoint documentation and reference.

| Document | Description | Audience |
|----------|-------------|----------|
| [API-ENDPOINT-REFERENCE.md](./api/API-ENDPOINT-REFERENCE.md) | Complete API endpoint reference with request/response schemas | Contributors |

### Migration (`docs/migration/`)

Migration guides for API and architecture changes.

| Document | Description | Audience |
|----------|-------------|----------|
| [T3-API-MIGRATION-CHECKLIST.md](./migration/T3-API-MIGRATION-CHECKLIST.md) | **NEW** - Checklist for migrating from plural to singular API paths (DB API v0.5.0) | Contributors |

### Guides (`docs/guides/`)

Step-by-step implementation guides.

| Document | Description | Audience |
|----------|-------------|----------|
| [GETTING-STARTED.md](./guides/GETTING-STARTED.md) | **Start here** - Setup guide for pioneers and new developers | All |
| [REFACTORING-SUMMARY.md](./guides/REFACTORING-SUMMARY.md) | Type refactoring guide - migrating from RouterOutputs to direct type exports | Contributors |

### Reference (`docs/reference/`)

Technical reference documentation.

| Document | Description | Audience |
|----------|-------------|----------|
| [EVIDENCE-STORAGE-FORMAT.md](./reference/EVIDENCE-STORAGE-FORMAT.md) | Evidence storage format specification for assignments | Contributors |

### Sitemaps (`docs/sitemaps/`)

Route structure and state management documentation.

| Document | Description | Audience |
|----------|-------------|----------|
| [README.md](./sitemaps/README.md) | Overview of sitemap documentation | Contributors |
| [course-local-state.md](./sitemaps/course-local-state.md) | Course-related routes and local state | Contributors |
| [project-local-state.md](./sitemaps/project-local-state.md) | Project-related routes and local state | Contributors |
| [andamioscan-api.md](./sitemaps/andamioscan-api.md) | Andamioscan API integration documentation | Contributors |

---

## Document Status Legend

Each document may include status indicators:

- ✅ **Complete** - Fully documented and up-to-date
- ⏳ **In Progress** - Partially complete or being updated
- 📋 **Planned** - Documented for future implementation
- ❌ **Deprecated** - No longer applicable

---

## Quick Links

### Root Files
- [README.md](../README.md) - Project overview and quick start
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [.env.example](../.env.example) - Environment configuration template

### Key Configuration Files
- `.claude/CLAUDE.md` - AI assistant instructions and project context
- `src/styles/globals.css` - CSS variables, breakpoints, semantic colors
- `src/components/andamio/` - Andamio component library

### External Resources
- [Andamio Platform](https://andamio.io) | [Andamio Pioneers](https://docs.andamio.io/docs/pioneers)
- [T3 Stack Documentation](https://create.t3.gg/)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Mesh SDK Documentation](https://meshjs.dev)
- [Tiptap Editor](https://tiptap.dev)
- [Andamio Discord](https://discord.gg/abBbsGZpZ5)

---

## Contributing to Documentation

When adding or updating documentation:

1. **Place files in the correct category folder**
2. **Update this MOC** with a link and description
3. **Include audience tags** (All, Contributors, Newcomers)
4. **Use consistent formatting** - follow existing document patterns
5. **Add status indicators** where applicable

### Naming Conventions
- Use `UPPERCASE-KEBAB-CASE.md` for top-level docs
- Use `lowercase-kebab-case.md` for sub-category docs
- Be descriptive but concise

---

*Last Updated: January 14, 2026*

---

> **Note**: Primary documentation has moved to `.claude/skills/` directories. This folder contains legacy documentation that may be outdated.
