# Morningo

The Executive Assistant You Never Hired.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Supabase Authentication
- Supabase Database
- OpenAI API

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

3. Apply the Supabase migration in `supabase/migrations`.

4. Start the app:

```bash
pnpm run dev
```

## Features

- Login and signup with Supabase Auth
- Inbox add, delete, and list flows backed by Supabase RLS
- Daily brief generation with OpenAI
- Dashboard sections for Focus Today, Can Wait, Risks, and Suggested Next Action
