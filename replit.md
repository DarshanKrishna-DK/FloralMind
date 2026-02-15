# FloralMind - AI-Native Conversational Analytics Platform

## Overview
FloralMind is a production-grade conversational analytics platform that transforms static CSV data into interactive, AI-powered dashboards. Users upload datasets and get auto-generated visualizations or build dashboards manually, then explore their data through natural language conversations with Claude AI. Features corporate-ready export capabilities and a floral-inspired design theme.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React with TypeScript, Vite build tool
- **Styling**: Tailwind CSS with custom floral theme (pink/cream/purple palette)
- **Charts**: Recharts for data visualization (bar, line, pie, area, scatter)
- **Routing**: Wouter
- **State**: TanStack React Query for server state
- **UI Components**: Shadcn UI component library
- **Animations**: Framer Motion + CSS keyframe animations (floating orbs)

### Backend (Node.js + Express)
- **Server**: Express.js with TypeScript
- **App Database**: PostgreSQL via Drizzle ORM (datasets metadata, conversations, messages)
- **Data Storage**: SQLite via better-sqlite3 (user-uploaded datasets stored as individual SQLite files)
- **File Upload**: Multer for CSV processing
- **CSV Parsing**: PapaParse
- **Validation**: Zod schemas on all API routes

### AI Layer
- **Provider**: Claude API via Replit AI Integrations (claude-sonnet-4-5)
- **Capabilities**: Dashboard generation, SQL query generation, insight analysis, hypothesis generation, report generation

## Key Files
- `shared/schema.ts` - Database schema (datasets, conversations, messages) + TypeScript types
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - PostgreSQL CRUD operations via Drizzle
- `server/sqlite-manager.ts` - SQLite operations for user-uploaded data
- `server/ai-service.ts` - Claude AI integration for analytics
- `server/db.ts` - PostgreSQL connection setup
- `client/src/pages/landing.tsx` - Animated landing page with hero, features, how-it-works sections
- `client/src/pages/upload.tsx` - CSV upload with AI/Manual mode selection
- `client/src/pages/dashboard.tsx` - Main dashboard with sidebar, charts, chat, exports
- `client/src/components/chat-panel.tsx` - AI conversation interface (split-pane)
- `client/src/components/chart-card.tsx` - Recharts visualization wrapper with type switcher
- `client/src/components/metric-card.tsx` - KPI metric display cards
- `client/src/components/manual-chart-builder.tsx` - Manual chart creation UI

## Routes
- `/` - Landing page (animated hero, features, how-it-works, CTA)
- `/upload` - CSV upload with mode selection (AI-generated vs manual build)
- `/dashboard/:id` - Dashboard view with sidebar, charts, chat panel, exports

## Data Flow
1. User uploads CSV → Multer handles file → PapaParse parses → Schema detected
2. SQLite table created from CSV data → Dataset metadata stored in PostgreSQL
3. AI analyzes schema + statistics → Generates dashboard with metrics + charts (or user builds manually)
4. User asks questions → AI generates SQL → Executes on SQLite → Returns chart + insight
5. Click chart elements → AI generates hypotheses and deeper analysis
6. Export dashboard as PNG/PDF/CSV or generate AI report

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/datasets/upload` - Upload CSV file
- `GET /api/datasets` - List all datasets
- `GET /api/datasets/:id` - Get dataset details
- `GET /api/datasets/:id/dashboard` - Generate AI dashboard
- `POST /api/datasets/:id/query` - Ask AI question about data (Zod validated)
- `POST /api/datasets/:id/sql` - Execute raw SQL query (Zod validated, keyword blocking, LIMIT enforced)
- `POST /api/datasets/:id/report` - Generate AI analytics report
- `POST /api/supabase/tables` - Connect to Supabase and list accessible tables (Zod validated)
- `POST /api/supabase/import` - Import a Supabase table as a local dataset (Zod validated)

## User Preferences
- Theme: Light pink, cream, white with soft purple accents (floral-inspired, not literal flowers)
- Font: Plus Jakarta Sans
- Dark mode supported via class-based toggle

## Recent Changes
- 2026-02-15: Performance optimizations: React.memo on ChartCard, MetricCard, EChartCard; lazy-loaded ECharts
- 2026-02-15: Added ECharts-based "Subtle 3D" chart style with gradient/shadow depth effects (echart-card.tsx)
- 2026-02-15: AI confidence scoring: validation-based 1-5 scale displayed as Shield badges on assistant messages
- 2026-02-15: Voice interaction: speech-to-text (Web Speech API), text-to-speech (SpeechSynthesis), mute toggle
- 2026-02-15: AI Blueprint System: Claude returns structured JSON with grid positions for 12-column layout
- 2026-02-15: Dashboard Setup Panel (/setup/:id): chart count, layout style, density, chart style config
- 2026-02-15: Added layout template selector in sidebar (5 presets: 2-col, 3-col, featured, rows, mixed)
- 2026-02-15: Dashboard fits viewport without scrolling (dynamic rowHeight, PowerBI/Tableau style)
- 2026-02-15: Chat charts require explicit "Add to Dashboard" button (no auto-add)
- 2026-02-15: Fixed PNG/PDF export to capture full dashboard content properly
- 2026-02-15: Updated logo imports to use latest cropped versions
- 2026-02-15: Added Supabase database connection as data source option alongside CSV upload
- 2026-02-15: Created supabase-service.ts for table discovery and data import via @supabase/supabase-js
- 2026-02-15: Added API endpoints: POST /api/supabase/tables (list tables), POST /api/supabase/import (import table)
- 2026-02-15: Updated upload page with data source selector (Upload CSV / Connect Supabase)
- 2026-02-15: Updated landing page hero: FLORALMIND as main heading, "Dashboards that think" as tagline
- 2026-02-15: Removed scroll indicator from landing page hero section
- 2026-02-15: Fixed react-grid-layout type compatibility (cast as any for ResponsiveGridLayout)
- 2026-02-15: Added drag-and-drop resizable dashboard grid via react-grid-layout (ResponsiveGridLayout)
- 2026-02-15: Added column data preview (click column in sidebar → data table, "View Full Table" button)
- 2026-02-15: Enhanced AI report dialog with Preview/Raw toggle (react-markdown + remark-gfm)
- 2026-02-15: Added comprehensive export dropdown: HTML (standalone hostable), PNG, PDF, CSV
- 2026-02-15: Updated landing page: "Dashboards that think" hero heading, video background with dark overlay
- 2026-02-15: Added AI report generation with dialog UI (copy/download support)
- 2026-02-15: Added export functionality (PNG dashboard, PDF report, CSV data)
- 2026-02-15: Integrated AI chat as split-pane alongside dashboard with pinned chart support
- 2026-02-15: Added manual dashboard builder with column/chart selectors
- 2026-02-15: Added chart type switcher (bar/line/pie/area/scatter) on each chart card
- 2026-02-15: Built animated landing page with CSS floating orbs and smooth scroll sections
- 2026-02-15: Added Zod validation and SQL security hardening
- 2026-02-15: Initial MVP implementation with full upload → dashboard → chat flow
