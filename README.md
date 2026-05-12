# TrustScore — Solana Wallet Trust Scorer

TrustScore is a platform that analysis Solana address on the blockchain to help people detect fraud, rug pulls, and any other malicious activities. TrustScore offers real-time risk assessment of any Solana wallet with a trust score between 0 and 100.


## Quickstart
Prerequisites:
- Node.js 18+ and npm or pnpm

1. Install dependencies

```bash
npm install
```

2. Add environment variables

Create a `.env.local` in the project root with your Helius API key:

```env
HELIUS_API_KEY=your_helius_api_key_here
```

(Keep secrets out of version control.)

3. Run the app locally

```bash
npm run dev
```

Open `http://localhost:3000` to view the dashboard.

## Scripts
- `npm run dev` — start the dev server
- `npm run build` — build for production
- `npm start` — start the production server (after `build`)

## Development notes
- The Helius key should remain server-side; do not expose it in client bundles.
- Scoring is heuristic and intended for demonstration — review and extend before any production use.

---
