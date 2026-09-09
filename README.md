# Code N Chaos — Round 2: Tech Gaming Arena

A real-time interactive tech gaming platform built for the **Code N Chaos** event by **Codester Club, PSIT Kanpur**.

Participants compete through 3 sequential games — Emoji → Tech Word, Tech Crossword, and Technical Word Search — with a live leaderboard and admin controls.

## Tech Stack

- **React** (Vite + TypeScript)
- **Tailwind CSS v4**
- **Framer Motion** (animations)
- **Supabase** (Postgres + Realtime)
- **Vercel** (deployment)

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Copy your **Project URL** and **anon key** from Settings → API

### 2. Run the Database Schema

1. Open the **SQL Editor** in your Supabase dashboard
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Click **Run** — this creates all tables, views, RLS policies, and the `submit_score` RPC function

### 3. Set Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_PASSWORD=your-admin-password
```

### 4. Install & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 5. Deploy to Vercel

1. Push the repo to GitHub
2. Import in [Vercel](https://vercel.com)
3. Set the same 3 environment variables in Vercel project settings
4. Deploy — Vercel auto-detects Vite

## Application Routes

| Path | Description |
|---|---|
| `/` | Login (Name + Roll Number) |
| `/lobby` | Waiting room, unlocked games |
| `/game/emoji` | Game 1: Emoji → Tech Word |
| `/game/crossword` | Game 2: Tech Crossword |
| `/game/wordsearch` | Game 3: Word Search |
| `/leaderboard` | Live leaderboard (public display) |
| `/admin` | Admin panel (password-protected) |

## Admin Panel Features

- Start / End event
- Unlock games individually or all at once
- Live monitoring of all participant scores
- Speed bonus display (top 3 fastest finishers)
- Export results as CSV
- Reset event (with confirmation)

## Scoring

| Game | Points |
|---|---|
| Emoji → Tech Word | 10 pts per correct answer |
| Tech Crossword | 5 pts per correct word |
| Word Search | 2 pts per word found |
| Completion Bonus | +20 pts (all 3 games) |
| Speed Bonus | Top 3 fastest (admin-visible) |

**Ranking**: Total score (desc) → Total time (asc) as tiebreaker

## Event Day Checklist

1. ✅ Supabase project set up with schema
2. ✅ App deployed to Vercel with env vars
3. ✅ Test with 2-3 dummy participants
4. ✅ Open `/leaderboard` on projector screen
5. ✅ Open `/admin` on organizer laptop
6. ✅ Participants open the site and login
7. ✅ Start event → Unlock games → Monitor
"# Innovate-X" 
