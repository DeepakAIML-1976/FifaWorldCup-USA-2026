# PRD — WC Predictor (FIFA World Cup 2026)

## Problem Statement
A modern, responsive, immersive football prediction platform for FIFA World Cup 2026. Users predict match scores, MOTM, and tournament awards; earn points via accuracy; climb global, country, and weekly leaderboards. Dark stadium aesthetic, no mock data.

## Architecture
- Backend: FastAPI + Motor (MongoDB). All routes under `/api`. JWT auth via httpOnly cookies (bcrypt password hashing).
- Frontend: React (CRA) + Tailwind CSS + Bebas Neue/DM Sans typography. shadcn/ui primitives available.
- Real data: 104 matches, 48 teams, 16 stadiums seeded from user-uploaded Excel schedule.

## User Personas
- **Fan** — registers, predicts every match, calls award winners, climbs leaderboard.
- **Admin** — seeds final scores + MOTM + award winners; system auto-scores all predictions.

## Core Requirements (static)
- Email/password authentication (no Google/social).
- Predict match score + winner + MOTM (text input). Predictions lock at kickoff.
- 4 tournament awards (Golden Boot, Golden Glove, Player of Tournament, Fair Play) — text inputs, lock before first match.
- Scoring: winner +3, exact score +2 bonus, MOTM +1, each award +2.
- Leaderboard scopes: global, country, weekly.
- Pages: Home, Login, Register, Fixtures, Awards (auth), Leaderboard, Teams, Team detail, Stadiums, Stadium detail, Profile (auth), Admin (admin-only).
- "View Squad" hyperlink to https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf on every match card AND the awards page.

## What's Been Implemented (Feb 2026)
- [x] Auth: register, login, logout, /me, forgot-password (token returned & shown in UI for demo), reset-password
- [x] Admin seeded on startup (`admin@worldcup.com / Admin@2026`)
- [x] 104 matches, 48 teams (with country flag CDN + FIFA ranks + coaches), 16 stadiums (with images + capacity) — all seeded
- [x] Match predictions CRUD with kickoff lock
- [x] Awards predictions CRUD with tournament-start lock
- [x] Admin enters result → auto-scores all predictions → updates user totals
- [x] Admin enters award winners → auto-scores award picks
- [x] Leaderboard with accuracy %, predictions made, flags
- [x] All frontend pages with dark stadium theme, asymmetric heroes, Bebas Neue display headings
- [x] data-testid coverage on key interactive elements
- [x] **Iter 2**: Forgot/Reset password pages with token-in-UI flow
- [x] **Iter 2**: Admin one-click inline scoring table — score+MOTM inputs always visible, instant scoring + leaderboard update
- [x] **Iter 2**: Social share buttons (Twitter, Facebook, Instagram copy, Copy link) on Profile rank, Leaderboard "my rank" banner, and each match prediction
- [x] 100% backend + frontend test coverage (pytest 30 tests + Playwright flows) across 2 iterations

## Backlog (deferred / next phases)
### P1
- [ ] Real-time live score ticker (websocket) during matches
- [ ] Friends leaderboard + private mini-leagues
- [ ] Achievement badges + XP levels + prediction streaks
- [ ] Push notifications + match countdown timers on home
- [ ] Profile avatar upload (needs object storage)
- [ ] Forgot password email delivery (currently logged to console)

### P2
- [ ] AI-powered match previews (LLM)
- [ ] Polls, trivia, fantasy football mini-game
- [ ] Match chat rooms + prediction sharing to social media
- [ ] PWA + offline support + SEO schema markup
- [ ] Rate limiting + bot protection + GDPR consent
- [ ] CDN integration + production CORS allowlist
- [ ] Split server.py into routers (auth/matches/admin) per testing reviewer note

## Test Credentials
See `/app/memory/test_credentials.md`
