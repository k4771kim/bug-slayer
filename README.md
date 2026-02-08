# Bug Slayer: The Debugging Dungeon

Turn-based RPG web game for developers. Battle bugs, level up your coding skills!

## 🎮 Project Overview

- **Genre**: Turn-based RPG
- **Platform**: Web (Next.js 15 + Phaser.js 3.60)
- **Target Audience**: Developers
- **Development**: AI-first methodology with human review

## 🏗️ Monorepo Structure

```
bug-slayer/
├── apps/
│   ├── web/          # Next.js 15 frontend (React + Phaser.js)
│   └── server/       # Express backend (REST API)
├── packages/
│   ├── game-engine/  # Phaser.js game logic & combat system
│   └── shared/       # Shared TypeScript types & constants
└── data/             # Game content JSON files
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env

# Generate Prisma client
cd apps/server
pnpm db:generate

# Run database migrations
pnpm db:migrate
```

### Development

```bash
# Start all services (web + server)
pnpm dev

# Start individual services
cd apps/web && pnpm dev      # Frontend only (http://localhost:3000)
cd apps/server && pnpm dev   # Backend only (http://localhost:3001)
```

### Building for Production

```bash
# Build all packages
pnpm build

# Start production server
pnpm start
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 📦 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Game Engine**: Phaser.js 3.60+
- **State Management**: Zustand
- **Styling**: CSS Modules
- **Language**: TypeScript

### Backend
- **Framework**: Express
- **Database**: SQLite
- **ORM**: Prisma
- **Auth**: JWT
- **Validation**: Zod

### Monorepo
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Linting**: ESLint
- **Formatting**: Prettier

## 🎯 MVP Features (v1.0)

- ✅ 4 Character Classes (Debugger, Refactorer, FullStack, DevOps)
- ✅ 2 Chapters (10 bugs + 2 bosses)
- ✅ Turn-based combat system with confirmed formulas
- ✅ Tech Debt mechanic (0-100)
- ✅ Single-player mode
- ✅ 1 Minigame
- ✅ 2 Endings

## 📖 Documentation

- [Game Design Document](../docs/01-plan/BUG_SLAYER_GDD.md)
- [Implementation Plan](../IMPLEMENTATION_PLAN.md)
- [Coding Conventions](../docs/01-plan/conventions.md)
- [Design Document](../docs/02-design/features/release-v1.design.md)

## 🤝 Contributing

This is an AI-driven development project. All code contributions are made by AI agents with human review.

## 📝 License

Proprietary - All rights reserved

---

**Project Status**: Week 1-1 - Monorepo Initialization Complete ✅
