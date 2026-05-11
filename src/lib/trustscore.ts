export type NormalizedTransaction = {
  signature: string;
  blockTime: number;
  type: string;
  source: string;
  destination: string;
  amount: number;
  fee: number;
  status: 'success' | 'failed';
};

export type WalletAnalysisResponse = {
  address: string;
  totalTransactions: number;
  totalVolume: number;
  transactions: NormalizedTransaction[];
  anomalyScore: {
    score: number;
    factors: {
      rapidTransactions: number;
      largeTransactions: number;
      failureRate: number;
      suspiciousPatterns: number;
      newWalletRisk: number;
    };
    risks: string[];
  };
  maliciousAnalysis: {
    indicators: {
      rugPullIndicators: number;
      honeypotIndicators: number;
      pumpDumpIndicators: number;
      scamIndicators: number;
      moneyLaunderingIndicators: number;
      botActivityIndicators: number;
      totalMaliciousScore: number;
    };
    threats: string[];
    legitimateReasons: string[];
    isMalicious: boolean;
    maliciousLevel: string;
    swapCount: number;
    successRate: string;
  };
  trustScore: {
    overall: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
};

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HELIUS_BASE_URL = 'https://api.helius.xyz/v0';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeTransaction(tx: any): NormalizedTransaction | null {
  if (!tx || typeof tx !== 'object') return null;

  let type = tx.type || 'Transaction';
  let amount = 0;
  let source = tx.feePayer || 'Unknown';
  let destination = tx.feePayer || 'Unknown';

  if (tx.type === 'TRANSFER' || tx.type === 'SYSTEM_PROGRAM') {
    type = 'Transfer';
    const transfer = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers[0] : null;
    amount = toNumber(transfer?.amount);
    source = transfer?.fromUserAccount || source;
    destination = transfer?.toUserAccount || destination;
  } else if (tx.type === 'TOKEN_TRANSFER' || tx.type === 'SPL_TOKEN_TRANSFER') {
    type = 'Token Transfer';
    const transfer = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers[0] : null;
    amount = toNumber(transfer?.tokenAmount);
    source = transfer?.fromUserAccount || source;
    destination = transfer?.toUserAccount || destination;
  } else if (tx.type === 'SWAP') {
    type = 'Swap';
    amount = Array.isArray(tx.nativeTransfers)
      ? tx.nativeTransfers.reduce((sum: number, transfer: any) => sum + toNumber(transfer?.amount), 0)
      : 0;
    if (!amount && Array.isArray(tx.tokenTransfers)) {
      amount = tx.tokenTransfers.reduce(
        (sum: number, transfer: any) => sum + toNumber(transfer?.tokenAmount),
        0
      );
    }
  } else if (tx.type === 'CREATE_ACCOUNT') {
    type = 'Create Account';
  } else if (tx.type === 'CLOSE_ACCOUNT') {
    type = 'Close Account';
  }

  const status = tx.error || tx.status === 'failed' ? 'failed' : 'success';

  return {
    signature: tx.signature || '',
    blockTime: toNumber(tx.timestamp || tx.blockTime),
    type,
    source,
    destination,
    amount: Math.abs(amount),
    fee: toNumber(tx.fee),
    status,
  };
}

export function analyzeAnomalies(transactions: NormalizedTransaction[], totalVolume: number) {
  if (!transactions.length) {
    return {
      score: 0,
      factors: {
        rapidTransactions: 0,
        largeTransactions: 0,
        failureRate: 0,
        suspiciousPatterns: 0,
        newWalletRisk: 50,
      },
      risks: ['No transactions found'],
    };
  }

  const factors = {
    rapidTransactions: 0,
    largeTransactions: 0,
    failureRate: 0,
    suspiciousPatterns: 0,
    newWalletRisk: 0,
  };
  const risks: string[] = [];

  const timeWindows: Record<string, number> = {};
  for (const tx of transactions) {
    const hour = Math.floor(tx.blockTime / 3600);
    timeWindows[String(hour)] = (timeWindows[String(hour)] || 0) + 1;
  }

  const maxTxInWindow = Math.max(...Object.values(timeWindows), 0);
  if (maxTxInWindow > 10) {
    factors.rapidTransactions = Math.min((maxTxInWindow / 20) * 100, 100);
    risks.push(`Detected ${maxTxInWindow} transactions in a short time window`);
  }

  const avgAmount = totalVolume / Math.max(transactions.length, 1);
  const largeTransactions = transactions.filter((tx) => tx.amount > avgAmount * 3);
  if (largeTransactions.length > 0) {
    factors.largeTransactions = Math.min((largeTransactions.length / transactions.length) * 100, 100);
    risks.push(`Found ${largeTransactions.length} unusually large transactions`);
  }

  const failedTx = transactions.filter((tx) => tx.status === 'failed');
  const failureRate = (failedTx.length / Math.max(transactions.length, 1)) * 100;
  if (failureRate > 20) {
    factors.failureRate = failureRate;
    risks.push(`High failure rate: ${failureRate.toFixed(1)}%`);
  }

  const destinationMap: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.destination && tx.destination !== 'Unknown') {
      destinationMap[tx.destination] = (destinationMap[tx.destination] || 0) + 1;
    }
  }

  let suspiciousCount = 0;
  for (const count of Object.values(destinationMap)) {
    if (count > 5) suspiciousCount += 2;
  }

  const zeroAmountTxs = transactions.filter((tx) => tx.amount === 0);
  if (zeroAmountTxs.length > transactions.length * 0.1) suspiciousCount += 3;

  factors.suspiciousPatterns = suspiciousCount;
  if (suspiciousCount > 0) risks.push(`Detected ${suspiciousCount} suspicious transaction patterns`);

  if (transactions.length < 5) {
    factors.newWalletRisk = 50;
    risks.push('Wallet has very few transactions');
  } else if (transactions.length < 20) {
    factors.newWalletRisk = 25;
  }

  const score =
    (factors.rapidTransactions +
      factors.largeTransactions +
      factors.failureRate +
      factors.suspiciousPatterns +
      factors.newWalletRisk) /
    5;

  return { score: Math.min(score, 100), factors, risks };
}

export function detectMaliciousBehavior(transactions: NormalizedTransaction[], totalVolume: number) {
  if (!transactions.length) {
    return {
      indicators: {
        rugPullIndicators: 0,
        honeypotIndicators: 0,
        pumpDumpIndicators: 0,
        scamIndicators: 0,
        moneyLaunderingIndicators: 0,
        botActivityIndicators: 0,
        totalMaliciousScore: 0,
      },
      threats: ['No transactions found'],
      legitimateReasons: [],
      isMalicious: false,
      maliciousLevel: 'CLEAN',
      swapCount: 0,
      successRate: '0.0',
    };
  }

  const indicators = {
    rugPullIndicators: 0,
    honeypotIndicators: 0,
    pumpDumpIndicators: 0,
    scamIndicators: 0,
    moneyLaunderingIndicators: 0,
    botActivityIndicators: 0,
    totalMaliciousScore: 0,
  };

  const threats: string[] = [];
  const legitimateReasons: string[] = [];

  const swaps = transactions.filter((tx) => tx.type === 'Swap');
  const transfers = transactions.filter((tx) => tx.type === 'Transfer');
  const tokenTransfers = transactions.filter((tx) => tx.type === 'Token Transfer');
  const successfulTxs = transactions.filter((tx) => tx.status === 'success');
  const failedTxs = transactions.filter((tx) => tx.status === 'failed');

  const largeWithdrawals = transactions.filter(
    (tx) => tx.amount > (totalVolume / transactions.length) * 10 && tx.type !== 'Swap'
  );
  const hasIncomingTransfers = transactions.some((tx) => tx.destination && tx.destination !== 'Unknown');

  if (largeWithdrawals.length > 0 && !hasIncomingTransfers && swaps.length === 0) {
    indicators.rugPullIndicators += largeWithdrawals.length * 15;
    threats.push(`Rug pull risk: ${largeWithdrawals.length} large withdrawals with no trading activity`);
  } else if (largeWithdrawals.length > 0) {
    legitimateReasons.push('Large transactions detected but wallet has active trading');
  }

  const failureRate = (failedTxs.length / transactions.length) * 100;
  const failedTransfers = failedTxs.filter(
    (tx) => tx.type === 'Transfer' || tx.type === 'Token Transfer'
  );
  const failureRatioOfTransfers =
    failedTransfers.length / Math.max(transfers.length + tokenTransfers.length, 1);

  if (failureRate > 50 && failureRatioOfTransfers > 0.7) {
    indicators.honeypotIndicators += failureRate;
    threats.push(`Honeypot risk: ${failureRate.toFixed(1)}% transfer failure rate`);
  } else if (failureRate > 30) {
    if (swaps.length > 0) {
      legitimateReasons.push('Some failed transactions but wallet actively trades');
    } else {
      indicators.honeypotIndicators += failureRate * 0.5;
      threats.push('Moderate failure rate detected');
    }
  }

  const destinationMap: Record<string, number> = {};
  const timeWindows: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.destination && tx.type !== 'Swap') {
      destinationMap[tx.destination] = (destinationMap[tx.destination] || 0) + 1;
    }
    const hour = Math.floor(tx.blockTime / 3600);
    timeWindows[String(hour)] = (timeWindows[String(hour)] || 0) + 1;
  }

  const suspiciousDestinations = Object.values(destinationMap).filter((count) => count > 8).length;
  if (suspiciousDestinations > 2 && swaps.length === 0) {
    indicators.pumpDumpIndicators += suspiciousDestinations * 20;
    threats.push('Pump and dump risk: repeated transfers to the same destinations');
  } else if (suspiciousDestinations > 0) {
    legitimateReasons.push('Multiple destinations but wallet has swap activity');
  }

  const zeroAmountRatio = transactions.filter((tx) => tx.amount === 0).length / transactions.length;
  if (zeroAmountRatio > 0.3 && swaps.length === 0) {
    indicators.scamIndicators += 25;
    threats.push(`Scam risk: ${(zeroAmountRatio * 100).toFixed(1)}% zero-amount transactions`);
  } else if (zeroAmountRatio > 0.1) {
    legitimateReasons.push('Some zero-amount transactions but wallet has swap activity');
  }

  let circularCount = 0;
  const txMap: Record<string, string[]> = {};
  for (const tx of transactions) {
    if (!txMap[tx.source]) txMap[tx.source] = [];
    txMap[tx.source].push(tx.destination);
  }

  for (const [source, destinations] of Object.entries(txMap)) {
    for (const destination of destinations) {
      if (txMap[destination]?.includes(source)) circularCount++;
    }
  }

  if (circularCount > 5 && swaps.length === 0) {
    indicators.scamIndicators += circularCount * 5;
    threats.push(`Scam risk: ${circularCount} circular transaction patterns`);
  } else if (circularCount > 0) {
    legitimateReasons.push('Some circular patterns but wallet has swap activity');
  }

  const maxTxInWindow = Math.max(...Object.values(timeWindows), 0);
  if (maxTxInWindow > 30 && swaps.length === 0) {
    indicators.moneyLaunderingIndicators += (maxTxInWindow - 30) * 3;
    threats.push(`Money laundering risk: ${maxTxInWindow} transactions in one hour`);
  } else if (maxTxInWindow > 15) {
    if (swaps.length > 0) {
      legitimateReasons.push('High transaction frequency but wallet actively trades');
    } else {
      indicators.moneyLaunderingIndicators += maxTxInWindow - 15;
    }
  }

  const amountFrequency: Record<number, number> = {};
  for (const tx of transactions) {
    const roundedAmount = Math.round(tx.amount / 1e6);
    amountFrequency[roundedAmount] = (amountFrequency[roundedAmount] || 0) + 1;
  }

  const repeatingAmounts = Object.values(amountFrequency).filter((count) => count > 5).length;
  if (repeatingAmounts > 2 && swaps.length === 0) {
    indicators.botActivityIndicators += repeatingAmounts * 10;
    threats.push(`Bot activity risk: ${repeatingAmounts} repeated-amount patterns`);
  } else if (repeatingAmounts > 0) {
    legitimateReasons.push('Some identical amounts but wallet has swap activity');
  }

  if (transactions.length > 100 && transactions.length / 24 > 10 && swaps.length === 0) {
    indicators.botActivityIndicators += 15;
    threats.push('Bot activity risk: abnormally high transaction frequency');
  } else if (transactions.length > 50) {
    legitimateReasons.push('High transaction count but wallet has swap activity');
  }

  indicators.totalMaliciousScore = Math.min(
    (indicators.rugPullIndicators +
      indicators.honeypotIndicators +
      indicators.pumpDumpIndicators +
      indicators.scamIndicators +
      indicators.moneyLaunderingIndicators +
      indicators.botActivityIndicators) /
      6,
    100
  );

  const successRate = ((successfulTxs.length / Math.max(transactions.length, 1)) * 100).toFixed(1);
  const isMalicious = indicators.totalMaliciousScore > 50 && swaps.length === 0;
  const maliciousLevel = getMaliciousLevel(indicators.totalMaliciousScore);

  return {
    indicators,
    threats,
    legitimateReasons,
    isMalicious,
    maliciousLevel,
    swapCount: swaps.length,
    successRate,
  };
}

export function getMaliciousLevel(score: number) {
  if (score >= 80) return 'EXTREMELY MALICIOUS';
  if (score >= 60) return 'HIGHLY SUSPICIOUS';
  if (score >= 50) return 'SUSPICIOUS';
  if (score >= 30) return 'POTENTIALLY RISKY';
  return 'CLEAN';
}

export function buildRecommendations(
  trustScore: number,
  maliciousAnalysis: ReturnType<typeof detectMaliciousBehavior>,
  anomalyScore: ReturnType<typeof analyzeAnomalies>
) {
  const recommendations: string[] = [];

  if (maliciousAnalysis.isMalicious && maliciousAnalysis.swapCount === 0) {
    recommendations.push(`MALICIOUS ACCOUNT DETECTED: ${maliciousAnalysis.maliciousLevel}`);
    recommendations.push('Do not transact with this wallet');
    recommendations.push('Report to platform administrators');
    recommendations.push(...maliciousAnalysis.threats);
    return recommendations;
  }

  if (maliciousAnalysis.swapCount > 0) {
    recommendations.push(`Active trader: ${maliciousAnalysis.swapCount} swaps detected`);
    recommendations.push(`Success rate: ${maliciousAnalysis.successRate}%`);
  }

  if (trustScore < 20) {
    recommendations.push('Critical risk: avoid transactions with this wallet');
  } else if (trustScore < 40) {
    recommendations.push('High risk: review transaction history carefully');
  } else if (trustScore < 60) {
    recommendations.push('Medium risk: monitor the wallet before interacting');
  } else {
    recommendations.push('Wallet appears to have normal activity');
  }

  if (anomalyScore.risks.length) {
    recommendations.push(...anomalyScore.risks);
  }
  if (maliciousAnalysis.legitimateReasons.length) {
    recommendations.push(...maliciousAnalysis.legitimateReasons);
  }

  return recommendations;
}

export async function fetchWalletTransactions(address: string) {
  if (!HELIUS_API_KEY) {
    throw new Error('Missing HELIUS_API_KEY in environment variables');
  }

  if (!address || address.length < 32) {
    throw new Error('Invalid Solana wallet address');
  }

  const response = await fetch(
    `${HELIUS_BASE_URL}/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=100`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch wallet data from Helius');
  }

  const data = await response.json();
  const rawTransactions = Array.isArray(data)
    ? data
    : Array.isArray(data?.transactions)
      ? data.transactions
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.result)
          ? data.result
          : [];

  const transactions = rawTransactions
    .map((tx: unknown) => normalizeTransaction(tx))
    .filter((tx: NormalizedTransaction | null): tx is NormalizedTransaction => tx !== null);

  const totalVolume = transactions.reduce(
    (sum: number, tx: NormalizedTransaction) => sum + tx.amount,
    0
  );
  const anomalyScore = analyzeAnomalies(transactions, totalVolume);
  const maliciousAnalysis = detectMaliciousBehavior(transactions, totalVolume);
  const trustScoreValue = Math.max(
    0,
    100 - (maliciousAnalysis.indicators.totalMaliciousScore * 0.6 + anomalyScore.score * 0.4)
  );

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (trustScoreValue < 20) riskLevel = 'critical';
  else if (trustScoreValue < 40) riskLevel = 'high';
  else if (trustScoreValue < 60) riskLevel = 'medium';

  const trustScore = {
    overall: Math.round(trustScoreValue),
    riskLevel,
    recommendations: buildRecommendations(Math.round(trustScoreValue), maliciousAnalysis, anomalyScore),
  };

  return {
    address,
    totalTransactions: transactions.length,
    totalVolume,
    transactions,
    anomalyScore,
    maliciousAnalysis,
    trustScore,
  } satisfies WalletAnalysisResponse;
}
