# Raganor OPC — English README

> A one-person-company multi-agent orchestration framework: CEO + Worker + QA, with contracts and
> mechanical acceptance first.
> [中文](README.md) · English

One line of intent → morning and evening briefs. Long-running work is driven by a weekly rhythm
plus OKR and habit placeholders.

---

## Quick start

### Three steps to a morning + evening brief

```bash
# 1. Install dependencies
npm install

# 2. Generate the morning brief
npm run brief:morning

# 3. Generate the evening brief
npm run brief:evening
```

### Other usages

```bash
# Point at a different data directory
BRIEF_DATA_DIR=./my-data npm run brief:morning

# Force a mode (skips intent detection, useful for CI)
npm run brief:morning -- --mode evening

# Run the tests
npm test
```

---

## Project structure

```
raganor-opc/
├── src/
│   ├── cli/              # Command line entry point
│   ├── services/         # Core services
│   │   ├── data-loader.ts   # Data loading
│   │   ├── renderer.ts      # Brief rendering
│   │   └── intent.ts        # Intent detection
│   └── services/__tests__/ # Tests
├── examples/
│   └── demo-data/        # Sample data
├── v0.1/                # Core specifications
│   ├── orchestration.md
│   ├── ceo-agent-architecture.md
│   └── personal-butler.md
├── docs/
│   ├── design/           # Design documents
│   └── issues/           # Issues (synced from GitHub)
```

---

## Data directory

| Variable | Default | Description |
|------|--------|-------------|
| `BRIEF_DATA_DIR` | `examples/demo-data/` | Root of the data directory |

The sample data includes schedule, todos, OKRs, and habits (all in demo mode).

---

## Disclaimers

- **Stock quotes**: placeholder feature, not investment advice
- **Health tracking**: placeholder feature, not a medical device

---

## Documentation index

| Entry point | Description |
|------|-------------|
| [docs/design/README.md](./docs/design/README.md) | Design portal (recommended starting point) |
| [docs/design/system-design.md](./docs/design/system-design.md) | System architecture diagram |
| [v0.1/personal-butler.md](./v0.1/personal-butler.md) | Personal Butler v1 specification |
| [docs/issues/README.md](./docs/issues/README.md) | Issue tracking |

---

## Status

- **Personal Butler v1**: in development (CLI core is complete)
- **Platform v1**: planned (CEO service + community-chat)

## License

MIT
