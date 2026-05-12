# TrustScore — Solana Wallet Trust Scorer

TrustScore is a platform that analyzes Solana addresses on the blockchain to help people detect fraud, rug pulls, and any other malicious activities. TrustScore provides a real-time risk assessment of any Solana address, assigning a trust score ranging from 0 to 100.

## How the trust score is detected

It uses deterministic scoring logic in `src/lib/trustscore.ts` based on wallet behavior.

1. The backend fetches up to 100 transactions for the wallet from Helius.
2. Each raw transaction is normalized into a simpler shape: type, source, destination, amount, fee, status, and timestamp.
3. The analyzer runs two rule-based checks:
   - **Anomaly detection** looks for rapid activity, unusually large transfers, failed transactions, suspicious repeated destinations, and new-wallet risk.
   - **Malicious behavior detection** looks for patterns associated with rug pulls, honeypots, pump-and-dump activity, scams, money laundering, and bot-like behavior.
4. The final trust score is calculated with a weighted formula:

```text
trustScore = 100 - (maliciousScore * 0.6 + anomalyScore * 0.4)
```

5. The result is clamped to a minimum of 0 and mapped to a risk level:
   - `low` for stronger wallets
   - `medium` for moderate risk
   - `high` for risky wallets
   - `critical` for the most suspicious wallets


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
