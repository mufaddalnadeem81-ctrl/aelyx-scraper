Badges: Tech stack badges (Node.js, React 19, Vite 8, Puppeteer Stealth, Tailwind CSS v4, Supabase, ISC License).
Features & Architecture: Highlights the stealth scraping engine, deep details extraction (phone, website, ratings, address breakdown), RAM-saving request interception, dual-layer database (Supabase + local JSON failover), rate limiting, and the dark glassmorphic "Aelyx OS" dashboard.
Quick Start Guide: Clear instructions for the unified root commands (npm run install-all and npm run start-all).
Environment Variables: Complete breakdowns for both frontend and backend configurations.
REST API Reference: Full specification with sample requests/responses for /api/scrape, /generate-key, /api/usage, and /api/login.
Deployment Advice: Specific configuration tips for low-memory environments like Render (using Browserless.io) and static frontend hosts (Vercel/Netlify).
backend/.env.example
 & 
frontend/.env.example
:

Clean starter templates documenting all environment variables without exposing sensitive production keys.
