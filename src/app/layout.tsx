import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TrustScore for Wallets',
  description: 'AI-powered Solana wallet risk scoring dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="inner">
            <div className="logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <circle cx="12" cy="12" r="10" fill="url(#g)" />
                <defs>
                  <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
              TrustScore
            </div>
            <div>
              <a className="btn-ghost" href="/" aria-label="Home">Dashboard</a>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
