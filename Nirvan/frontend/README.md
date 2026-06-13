# recruitx Frontend

Next.js 16 App Router client for the recruitx A2A hiring marketplace.

## Scripts

```bash
npm run dev    # Start local dev server on port 3000
npm run build  # Production build
npm run lint   # ESLint checks
```

## Required environment

Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Notes

- The production build currently passes.
- ESLint currently reports existing type-safety and React hook issues; see the project status doc for priorities.
- Uses the Next.js 16 `proxy.ts` convention for route guards.
