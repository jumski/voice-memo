# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit + Supabase starter project (based on KianKit template) that's intended to become a voice memo application. Currently, it provides authentication and UI infrastructure but no voice recording functionality has been implemented yet.

## Development Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:5173)
npm run check:watch  # Run TypeScript checking in watch mode

# Building
npm run build        # Create production build
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint and Prettier checks
npm run format       # Auto-format code with Prettier
npm run check        # Run TypeScript type checking

# Setup
npm install          # Install dependencies (also sets up Husky)
cp .env.example .env # Create environment file (add your Supabase credentials)
```

## Viewing the Development Server

When testing the application during development, always use the Playwright MCP tool to view http://localhost:5173. This allows you to:

1. Navigate to the development server using `mcp__playwright__browser_navigate`
2. Take screenshots of the current state with `mcp__playwright__browser_take_screenshot`
3. Interact with the UI elements using `mcp__playwright__browser_click` and other interaction tools
4. Sign in via Google OAuth by clicking the Google sign-in button on the login page

This approach ensures you can properly test authentication flows and see the actual rendered application state.

## Architecture Patterns

### Authentication Flow

The authentication system spans multiple files working together:

1. **`hooks.server.ts`** - Creates request-scoped Supabase clients and validates sessions with JWT verification
2. **`+layout.ts`** - Initializes browser/server clients based on environment
3. **`+layout.svelte`** - Monitors auth state changes and triggers reactive updates
4. **Auth routes** - Handle login/signup via form actions in `(auth)/[method]/+page.server.ts`

Key: The `authGuard` in hooks.server.ts is commented out - uncomment to protect `/app` routes.

### Form Handling Pattern

Forms use a type-safe, progressive enhancement approach:

1. Define Zod schema (e.g., `lib/schemas/auth.ts`)
2. Create server action with `superValidate`
3. Use `superForm` in component with `zodClient` adapter
4. Form components from `lib/components/ui/form` provide consistent styling

### Supabase Client Management

- Server-side: New client per request with cookie handling
- Client-side: Singleton client in browser
- Type safety via `App.Locals` interface
- Uses `depends('supabase:auth')` for reactive invalidation

### Component Architecture

- UI components use tailwind-variants for styling variations
- Form components wrap formsnap primitives
- Svelte 5 snippets for content projection
- Components are in `lib/components/ui/` with barrel exports

### Route Organization

```
routes/
├── (landing)/    # Public pages
├── (auth)/       # Auth flows (login/signup)
├── (app)/        # Protected app area (empty - implement voice memo here)
└── (seo)/        # SEO utilities
```

## Environment Setup

Required environment variables:

```bash
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Key Implementation Details

### Type Safety

- Global types augmented in `app.d.ts`
- Route types imported from `./$types`
- Zod schemas create TypeScript types via inference
- Generic form components maintain type safety through the stack

### State Management

- No global stores - uses SvelteKit's data loading
- Auth state flows through layouts via `load` functions
- Form state managed by Superforms
- Theme state via mode-watcher

### Security Patterns

- JWT validation before trusting sessions (`safeGetSession`)
- CSRF protection built into form actions
- Secure cookie configuration for auth
- Never trust `getSession()` alone - always validate with `getUser()`

## Next Steps for Voice Memo Implementation

The `/app` route group is empty and ready for voice memo features:

1. Create database schema for memos
2. Set up Supabase storage bucket for audio files
3. Implement recording UI with Web Audio API
4. Add playback components
5. Integrate transcription service if needed

## Important Notes

- Pre-commit hooks run ESLint and Prettier automatically
- The project uses Svelte 5 with new runes syntax (`$props`, `$state`, etc.)
- Forms work without JavaScript (progressive enhancement)
- All Supabase infrastructure is configured but only auth is implemented
