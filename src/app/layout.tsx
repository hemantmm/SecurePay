import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TrustScore for Wallets',
  description: 'AI-powered Solana wallet risk scoring dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
