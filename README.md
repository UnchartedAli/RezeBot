# RezeBot V2
Telegram Bot API moderation bot with PostgreSQL, multi-group management, inline Telegram settings and a web panel.

## Setup
1. Copy `.env.example` to `.env`.
2. Set `BOT_TOKEN`, `DATABASE_URL`, `SESSION_SECRET`, `PANEL_PUBLIC_URL`.
3. Run `npm install`.
4. Run `npm start`.

The database schema in `sql/schema.sql` is initialized automatically.

## Commands
/start /menu /panel /id /groupinfo /settings
/ban /unban /mute /unmute /kick /del /warn /rules /report

Never commit `.env` or secrets.
