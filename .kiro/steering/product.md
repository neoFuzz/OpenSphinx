# OpenSphinx — Product Overview

## What It Is
OpenSphinx is a web-based implementation of **Laser Chess** (also known as Khet) — a strategic board game where players move and rotate mirrored pieces on an 8×10 grid, then fire a laser that bounces off mirrors. A piece hit by the laser is removed; hitting the opponent's **Pharaoh** wins the game.

Live at **[opensphinx.online](https://opensphinx.online)** (Cloudflare Pages) backed by a server on **Render.com**.

## Core Features
- **Real-time multiplayer**: Room codes, 2 players + spectators via Socket.IO
- **Dual views**: Toggle between a 3D Three.js board and a 2D HTML/CSS board with animated laser effects
- **Game persistence**: Save/load named games to SQLite on the server
- **Authentication**: Discord OAuth 2.0 + JWT session tokens
- **Android app**: Capacitor wraps the web client as a native Android app (Google Play Store)
- **Security**: CSRF protection, rate limiting, Helmet headers, XSS sanitization (DOMPurify)
- **i18n**: Multi-language support via i18next

## Piece Types
`PHARAOH` · `PYRAMID` · `DJED` · `OBELISK` · `ANUBIS` · `LASER` · `SPHINX`

## Game Rules
- Each turn: move one piece one orthogonal step **or** rotate it 90°, then fire the active player's laser
- Laser reflects off mirrors (`/` or `\`) according to piece orientation
- A piece absorbing a laser hit is removed from the board
- Hitting your own Pharaoh is a loss; hitting the opponent's Pharaoh wins

## Board Variants
- `CLASSIC` · `IMHOTEP` · `DYNASTY` (setup variants)
- `CLASSIC` · `KHET_2_0` (rule variants — KHET_2_0 is partially stubbed)

## Target Users
Casual gamers, Laser Chess / Khet fans, mobile gamers, and developers studying real-time multiplayer architecture.

## Deployment
| Target | Platform |
|--------|----------|
| Server | Render.com (Node.js) |
| Client | Cloudflare Pages (static) |
| Android | Google Play Store (APK/AAB via CI) |
| API Docs | GitHub Pages (TypeDoc) |
