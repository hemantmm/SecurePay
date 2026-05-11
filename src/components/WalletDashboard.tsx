"use client";

import { FormEvent, useMemo, useState } from 'react';
import type { WalletAnalysisResponse } from '@/lib/trustscore';
import { sampleWalletResponse } from '@/lib/trustscore';

function formatSol(lamports: number) {
  return `${(lamports / 1e9).toFixed(4)} SOL`;
}

function formatAddress(address: string) {
  if (!address || address === 'Unknown') return 'Unknown';
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function formatDate(timestamp: number) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Pill({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'muted' }) {
  return <span className={`pill pill-${tone}`}>{label}</span>;
}

function ScoreArc({ score }: { score: number }) {
  const dashOffset = useMemo(() => 268 - (268 * score) / 100, [score]);

  return (
    <div className="score-arc">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="score-track" cx="60" cy="60" r="42" />
        <circle className="score-progress" cx="60" cy="60" r="42" style={{ strokeDashoffset: dashOffset }} />
      </svg>
      <div className="score-value">{score}</div>
      <div className="score-caption">Trust score</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export default function WalletDashboard() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<WalletAnalysisResponse | null>(null);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/analyze-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Analysis failed');
      }

      setData(payload);
      setShowAllRecommendations(false);
      setShowAllTransactions(false);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    const sample = sampleWalletResponse();
    setAddress(sample.address.slice(0, 44));
    setData(sample as WalletAnalysisResponse);
    setShowAllRecommendations(false);
    setShowAllTransactions(false);
  };

  const scoreTone = data
    ? data.trustScore.riskLevel === 'low'
      ? 'success'
      : data.trustScore.riskLevel === 'medium'
        ? 'warning'
        : 'danger'
    : 'muted';

  return (
    <main className="shell">
      <section className="hero">
        <div className="badge">AI + Web3 wallet risk engine</div>
        <h1>TrustScore for Wallets</h1>
        <p>
          Paste a Solana wallet address and the app pulls live transaction history through Helius,
          scores anomaly patterns, and highlights scam-like behavior.
        </p>

        <form className="analyze-form" onSubmit={handleSubmit} aria-label="Analyze wallet form">
          <label className="visually-hidden" htmlFor="wallet-address">Wallet address</label>
          <input
            id="wallet-address"
            type="text"
            placeholder="Enter Solana wallet address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            spellCheck={false}
            aria-label="Solana wallet address"
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={loading || !address.trim()}>
              {loading ? 'Analyzing...' : 'Analyze wallet'}
            </button>
            <button type="button" className="section-toggle" onClick={handleLoadSample}>
              Preview sample
            </button>
          </div>
        </form>

        <div className="helper-row">
          <span>Backend: Next.js API route</span>
          <span>Data: Helius Solana API</span>
          <span>Scoring: anomaly + malicious heuristics</span>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <div className="loading-card">
          <div className="spinner" />
          <div>
            <h3>Analyzing wallet...</h3>
            <p>Fetching transactions and computing trust score.</p>
          </div>
        </div>
      ) : null}

      {data ? (
        <section className="grid">
          <article className="panel score-panel">
            <div className="score-header">
              <div>
                <Pill
                  label={
                    data.maliciousAnalysis.isMalicious
                      ? data.maliciousAnalysis.maliciousLevel
                      : `Risk: ${data.trustScore.riskLevel}`
                  }
                  tone={scoreTone}
                />
                <h3>Wallet trust score</h3>
                <p>{data.maliciousAnalysis.isMalicious ? 'High-risk behavior detected' : 'Balanced risk snapshot'}</p>
              </div>
              <ScoreArc score={data.trustScore.overall} />
            </div>

            <div className="metric-row">
              <div className="metric">
                <span>Total volume</span>
                <strong>{formatSol(data.totalVolume)}</strong>
              </div>
              <div className="metric">
                <span>Malicious score</span>
                <strong>{data.maliciousAnalysis.indicators.totalMaliciousScore.toFixed(1)}</strong>
              </div>
            </div>
          </article>

          <article className="panel">
            <SectionTitle
              title="Risk signals"
              subtitle="Anomaly detector + wallet behavior heuristics"
            />
            <div className="signal-grid">
              <div><span>Rapid tx</span><strong>{data.anomalyScore.factors.rapidTransactions.toFixed(1)}</strong></div>
              <div><span>Large tx</span><strong>{data.anomalyScore.factors.largeTransactions.toFixed(1)}</strong></div>
              <div><span>Failure rate</span><strong>{data.anomalyScore.factors.failureRate.toFixed(1)}</strong></div>
              <div><span>Suspicious</span><strong>{data.anomalyScore.factors.suspiciousPatterns.toFixed(1)}</strong></div>
              <div><span>New wallet</span><strong>{data.anomalyScore.factors.newWalletRisk.toFixed(1)}</strong></div>
              <div><span>Swaps</span><strong>{data.maliciousAnalysis.swapCount}</strong></div>
            </div>
          </article>

          <article className="panel full">
            <div className="section-header">
              <SectionTitle title="Recommendations" subtitle="The app summarizes why the wallet is being scored the way it is." />
              {data.trustScore.recommendations.length > 2 ? (
                <button
                  type="button"
                  className="section-toggle"
                  onClick={() => setShowAllRecommendations((current) => !current)}
                >
                  {showAllRecommendations ? 'Show fewer' : 'Show more'}
                </button>
              ) : null}
            </div>
            <div className="recommendation-list">
              {data.trustScore.recommendations.slice(0, showAllRecommendations ? undefined : 2).map((item) => (
                <div key={item} className="recommendation-item">{item}</div>
              ))}
            </div>
          </article>

          {data.maliciousAnalysis.isMalicious ? (
            <article className="panel full danger-panel">
              <SectionTitle title="Threat breakdown" subtitle="Triggered only when the wallet crosses the malicious threshold." />
              <div className="signal-grid three">
                <div><span>Rug pull</span><strong>{data.maliciousAnalysis.indicators.rugPullIndicators.toFixed(1)}</strong></div>
                <div><span>Honeypot</span><strong>{data.maliciousAnalysis.indicators.honeypotIndicators.toFixed(1)}</strong></div>
                <div><span>Pump & dump</span><strong>{data.maliciousAnalysis.indicators.pumpDumpIndicators.toFixed(1)}</strong></div>
                <div><span>Scam</span><strong>{data.maliciousAnalysis.indicators.scamIndicators.toFixed(1)}</strong></div>
                <div><span>Money laundering</span><strong>{data.maliciousAnalysis.indicators.moneyLaunderingIndicators.toFixed(1)}</strong></div>
                <div><span>Bot activity</span><strong>{data.maliciousAnalysis.indicators.botActivityIndicators.toFixed(1)}</strong></div>
              </div>
            </article>
          ) : null}

          <article className="panel full">
            <div className="section-header">
              <SectionTitle title="Recent transactions" subtitle="Latest 20 transactions from the wallet history" />
              {data.transactions.length > 2 ? (
                <button
                  type="button"
                  className="section-toggle"
                  onClick={() => setShowAllTransactions((current) => !current)}
                >
                  {showAllTransactions ? 'Show fewer' : 'Show more'}
                </button>
              ) : null}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.slice(0, showAllTransactions ? 20 : 2).map((tx) => (
                    <tr key={tx.signature + tx.blockTime}>
                      <td><Pill label={tx.type} tone="muted" /></td>
                      <td>{formatAddress(tx.source)}</td>
                      <td>{formatAddress(tx.destination)}</td>
                      <td>{formatSol(tx.amount)}</td>
                      <td>{formatDate(tx.blockTime)}</td>
                      <td>
                        <Pill label={tx.status === 'success' ? 'Success' : 'Failed'} tone={tx.status === 'success' ? 'success' : 'danger'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {!data && !loading ? (
        <section className="panel intro-panel">
          <SectionTitle title="How it works" subtitle="This is the architecture you can present in your submission." />
          <div className="steps">
            <div>
              <strong>1. Frontend</strong>
              <p>Next.js dashboard collects the wallet address and renders the score, risks, and transaction table.</p>
            </div>
            <div>
              <strong>2. Backend</strong>
              <p>API route fetches wallet transactions from Helius and normalizes the raw blockchain payload.</p>
            </div>
            <div>
              <strong>3. AI scoring</strong>
              <p>Heuristic anomaly detection flags rapid transfers, failure spikes, repeated destinations, and scam-like behavior.</p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
