# TypeScript Workspace Plan

This is the next implementation step after the project documents and stack decision.

## Goal

Prepare a minimal TypeScript workspace for the first IndieRadar Data Engine without implementing source integrations yet.

## Scope

Create the basic project tooling:

- root `package.json`;
- package manager configuration;
- shared `tsconfig.json`;
- `.gitignore`;
- `.env.example`;
- workspace scripts for linting, type checking, and local service execution.

Prepare minimal service entry points:

- `apps/web` for the future web interface;
- `apps/api` for the future API surface;
- `services/crawler` for source collectors;
- `services/scheduler` for scheduled jobs;
- `services/analyzer` for normalization and report preparation.

Prepare Supabase boundaries:

- document required environment variables;
- keep secrets out of Git;
- place future schema and migration files under `database/`.

## Out Of Scope

- real Google Play, Reddit, Product Hunt, Hacker News, or RSS integrations;
- production deployment;
- authentication;
- payments;
- AI summaries;
- own app monitoring.

## First Workspace Milestone

The workspace is ready when a developer can install dependencies, run TypeScript type checks, and execute placeholder local commands for the crawler, scheduler, and analyzer services.
