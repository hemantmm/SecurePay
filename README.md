# TrustScore for Wallets

AI-powered Solana wallet trust scoring dashboard built with Next.js.

## What it does
- Fetches wallet transactions through Helius
- Normalizes Solana transaction history
- Scores risk using anomaly detection and scam heuristics
- Shows a trust score from 0 to 100
- Displays recommendations and recent transactions

## Setup
1. Install Node.js 18+.
2. Install dependencies:

   ```bash
   npm install
   ```

3. The Helius API key is already placed in `.env.local` for this workspace.
4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Project structure
- `src/app/page.tsx` - entry page
- `src/components/WalletDashboard.tsx` - frontend dashboard
- `src/app/api/analyze-wallet/route.ts` - backend API route
- `src/lib/trustscore.ts` - transaction parsing and scoring logic

## Notes
- The backend API route keeps the Helius key server-side.
- The scoring logic is heuristic, so it is demo-friendly and fast enough to ship by tomorrow.
