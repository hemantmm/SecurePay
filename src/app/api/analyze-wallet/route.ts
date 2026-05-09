import { NextResponse } from 'next/server';
import { fetchWalletTransactions } from '@/lib/trustscore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = String(body?.address || '').trim();

    const result = await fetchWalletTransactions(address);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
