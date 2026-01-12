/**
 * SEC EDGAR API Service
 * Fetches company filings and earnings data from SEC EDGAR
 */

// SEC requires www.sec.gov for ticker lookups, data.sec.gov for company facts
const SEC_TICKERS_URL = 'https://www.sec.gov';
const SEC_DATA_URL = 'https://data.sec.gov';
const SEC_HEADERS = {
  'User-Agent': 'ApexAlpha/1.0 contact@apexalpha.com', // SEC requires User-Agent without parentheses
  'Accept': 'application/json',
};

interface SECCompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    'us-gaap'?: {
      [key: string]: {
        label: string;
        description: string;
        units: {
          [unit: string]: Array<{
            end: string;
            val: number;
            accn: string;
            fy: number;
            fp: string;
            form: string;
            filed: string;
            frame?: string;
          }>;
        };
      };
    };
  };
}

interface SECCompanyTicker {
  cik_str: number | string;  // SEC returns this as a number, not string
  ticker: string;
  title: string;
}

export interface QuarterlyEarnings {
  quarter: string;
  fiscalYear: number;
  fiscalPeriod: string;
  endDate: string;
  filedDate: string;
  form: string;
  eps: number | null;
  revenue: number | null;
  netIncome: number | null;
  grossProfit: number | null;
}

// Cache for CIK lookups
const cikCache = new Map<string, string>();

/**
 * Get the CIK (Central Index Key) for a stock symbol
 */
async function getCIK(symbol: string): Promise<string | null> {
  // Check cache first
  if (cikCache.has(symbol.toUpperCase())) {
    return cikCache.get(symbol.toUpperCase())!;
  }

  try {
    // Fetch the company tickers list from SEC (must use www.sec.gov)
    const response = await fetch(`${SEC_TICKERS_URL}/files/company_tickers.json`, {
      headers: SEC_HEADERS,
    });

    if (!response.ok) {
      console.error('Failed to fetch SEC company tickers');
      return null;
    }

    const data: { [key: string]: SECCompanyTicker } = await response.json();

    // Find the matching ticker
    for (const key in data) {
      const company = data[key];
      if (company.ticker.toUpperCase() === symbol.toUpperCase()) {
        // Pad CIK to 10 digits (cik_str can be number or string from SEC)
        const cik = String(company.cik_str).padStart(10, '0');
        cikCache.set(symbol.toUpperCase(), cik);
        return cik;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching CIK:', error);
    return null;
  }
}

/**
 * Fetch company facts (financial data) from SEC EDGAR
 */
async function getCompanyFacts(cik: string): Promise<SECCompanyFacts | null> {
  try {
    const response = await fetch(
      `${SEC_DATA_URL}/api/xbrl/companyfacts/CIK${cik}.json`,
      { headers: SEC_HEADERS }
    );

    if (!response.ok) {
      console.error(`Failed to fetch company facts for CIK ${cik}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching company facts:', error);
    return null;
  }
}

/**
 * Extract quarterly earnings from SEC company facts
 */
function extractQuarterlyEarnings(facts: SECCompanyFacts): QuarterlyEarnings[] {
  const usGaap = facts.facts['us-gaap'];
  if (!usGaap) return [];

  const earnings: Map<string, Partial<QuarterlyEarnings>> = new Map();

  // Helper to get the most recent quarterly values
  const getQuarterlyValues = (concept: string, units: string[] = ['USD']) => {
    const conceptData = usGaap[concept];
    if (!conceptData?.units) return [];

    // Try each unit type in order (e.g., USD, USD/shares)
    for (const unit of units) {
      if (conceptData.units[unit]) {
        return conceptData.units[unit]
          .filter((item) => item.form === '10-Q' || item.form === '10-K')
          .filter((item) => item.fp === 'Q1' || item.fp === 'Q2' || item.fp === 'Q3' || item.fp === 'Q4' || item.fp === 'FY')
          .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
      }
    }
    return [];
  };

  // Get EPS data (uses USD/shares unit)
  let epsData = getQuarterlyValues('EarningsPerShareBasic', ['USD/shares']);
  if (epsData.length === 0) {
    epsData = getQuarterlyValues('EarningsPerShareDiluted', ['USD/shares']);
  }

  for (const item of epsData.slice(0, 12)) { // Last 12 quarters
    const key = `${item.fy}-${item.fp}`;
    if (!earnings.has(key)) {
      earnings.set(key, {
        fiscalYear: item.fy,
        fiscalPeriod: item.fp,
        endDate: item.end,
        filedDate: item.filed,
        form: item.form,
      });
    }
    earnings.get(key)!.eps = item.val;
    earnings.get(key)!.quarter = formatQuarter(item.fy, item.fp);
  }

  // Get Revenue data - try multiple common revenue concepts
  // Prioritize the source with the most recent data (highest fiscal year)
  const revenueSources = [
    getQuarterlyValues('RevenueFromContractWithCustomerExcludingAssessedTax', ['USD']),
    getQuarterlyValues('Revenues', ['USD']),
    getQuarterlyValues('SalesRevenueNet', ['USD']),
  ];

  // Find the source with the highest fiscal year (most recent data)
  let revenueData: typeof revenueSources[0] = [];
  let maxFy = 0;
  for (const source of revenueSources) {
    if (source.length > 0 && source[0].fy > maxFy) {
      maxFy = source[0].fy;
      revenueData = source;
    }
  }

  for (const item of revenueData.slice(0, 12)) {
    const key = `${item.fy}-${item.fp}`;
    if (earnings.has(key)) {
      earnings.get(key)!.revenue = item.val;
    }
  }

  // Get Net Income data
  let netIncomeData = getQuarterlyValues('NetIncomeLoss', ['USD']);
  if (netIncomeData.length === 0) {
    netIncomeData = getQuarterlyValues('ProfitLoss', ['USD']);
  }

  for (const item of netIncomeData.slice(0, 12)) {
    const key = `${item.fy}-${item.fp}`;
    if (earnings.has(key)) {
      earnings.get(key)!.netIncome = item.val;
    }
  }

  // Get Gross Profit data
  const grossProfitData = getQuarterlyValues('GrossProfit', ['USD']);

  for (const item of grossProfitData.slice(0, 12)) {
    const key = `${item.fy}-${item.fp}`;
    if (earnings.has(key)) {
      earnings.get(key)!.grossProfit = item.val;
    }
  }

  // Convert map to array and sort by date
  return Array.from(earnings.values())
    .filter((e): e is QuarterlyEarnings =>
      e.quarter !== undefined &&
      e.fiscalYear !== undefined &&
      e.fiscalPeriod !== undefined &&
      e.endDate !== undefined &&
      e.filedDate !== undefined &&
      e.form !== undefined
    )
    .map(e => ({
      ...e,
      eps: e.eps ?? null,
      revenue: e.revenue ?? null,
      netIncome: e.netIncome ?? null,
      grossProfit: e.grossProfit ?? null,
    }))
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
}

function formatQuarter(fiscalYear: number, fiscalPeriod: string): string {
  if (fiscalPeriod === 'FY') return `FY ${fiscalYear}`;
  return `${fiscalPeriod} ${fiscalYear}`;
}

/**
 * Get quarterly earnings for a stock symbol
 */
export async function getQuarterlyEarnings(symbol: string): Promise<QuarterlyEarnings[]> {
  try {
    // Get CIK for the symbol
    const cik = await getCIK(symbol);
    if (!cik) {
      console.log(`CIK not found for symbol ${symbol}`);
      return [];
    }

    // Get company facts
    const facts = await getCompanyFacts(cik);
    if (!facts) {
      console.log(`Company facts not found for ${symbol}`);
      return [];
    }

    // Extract earnings
    const earnings = extractQuarterlyEarnings(facts);

    return earnings;
  } catch (error) {
    console.error(`Error fetching SEC earnings for ${symbol}:`, error);
    return [];
  }
}

/**
 * Format large numbers for display
 */
export function formatLargeNumber(value: number | null): string {
  if (value === null) return '-';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  }

  return `${sign}$${absValue.toFixed(2)}`;
}
