# FloralMind - AI-Native Conversational Analytics Platform

## Overview
FloralMind is a production-grade conversational analytics platform that transforms static CSV data into interactive, AI-powered dashboards. Users upload datasets and get auto-generated visualizations, then explore their data through natural language conversations with Claude AI.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React with TypeScript, Vite build tool
- **Styling**: Tailwind CSS with custom floral theme (pink/cream/purple palette)
- **Charts**: Recharts for data visualization (bar, line, pie, area)
- **Routing**: Wouter
- **State**: TanStack React Query for server state
- **UI Components**: Shadcn UI component library
- **Animations**: Framer Motion

### Backend (Node.js + Express)
- **Server**: Express.js with TypeScript
- **App Database**: PostgreSQL via Drizzle ORM (datasets metadata, conversations, messages)
- **Data Storage**: SQLite via better-sqlite3 (user-uploaded datasets stored as individual SQLite files)
- **File Upload**: Multer for CSV processing
- **CSV Parsing**: PapaParse

### AI Layer
- **Provider**: Claude API via Replit AI Integrations (claude-sonnet-4-5)
- **Capabilities**: Dashboard generation, SQL query generation, insight analysis, hypothesis generation

## Key Files
- `shared/schema.ts` - Database schema (datasets, conversations, messages) + TypeScript types
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - PostgreSQL CRUD operations via Drizzle
- `server/sqlite-manager.ts` - SQLite operations for user-uploaded data
- `server/ai-service.ts` - Claude AI integration for analytics
- `server/db.ts` - PostgreSQL connection setup
- `client/src/pages/upload.tsx` - Landing page with CSV upload
- `client/src/pages/dashboard.tsx` - Main dashboard with sidebar, charts, chat
- `client/src/components/chat-panel.tsx` - AI conversation interface
- `client/src/components/chart-card.tsx` - Recharts visualization wrapper
- `client/src/components/metric-card.tsx` - KPI metric display cards

## Data Flow
1. User uploads CSV → Multer handles file → PapaParse parses → Schema detected
2. SQLite table created from CSV data → Dataset metadata stored in PostgreSQL
3. AI analyzes schema + statistics → Generates dashboard with metrics + charts
4. User asks questions → AI generates SQL → Executes on SQLite → Returns chart + insight
5. Click chart elements → AI generates hypotheses and deeper analysis

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/datasets/upload` - Upload CSV file
- `GET /api/datasets` - List all datasets
- `GET /api/datasets/:id` - Get dataset details
- `GET /api/datasets/:id/dashboard` - Generate AI dashboard
- `POST /api/datasets/:id/query` - Ask AI question about data
- `POST /api/datasets/:id/sql` - Execute raw SQL query

## User Preferences
- Theme: Light pink, cream, white with soft purple accents (floral-inspired, not literal flowers)
- Font: Plus Jakarta Sans
- Dark mode supported via class-based toggle

## Recent Changes
- 2026-02-15: Initial MVP implementation with full upload → dashboard → chat flow
