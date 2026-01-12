'use client';

import { useState } from 'react';
import { PiggyBank, TrendingUp, Calendar, Building2, ExternalLink, Info, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavingsProduct {
  institution: string;
  symbol?: string;
  logo?: string;
  type: 'HYSA' | 'CD' | 'Money Market';
  apy: number;
  minDeposit: number;
  term?: string;
  fdic: boolean;
  url: string;
  features?: string[];
}

// Updated savings rates data (as of January 2026)
const SAVINGS_PRODUCTS: SavingsProduct[] = [
  // High-Yield Savings Accounts
  {
    institution: 'Wealthfront',
    type: 'HYSA',
    apy: 4.50,
    minDeposit: 0,
    fdic: true,
    url: 'https://www.wealthfront.com/cash',
    features: ['No fees', 'No minimum', 'FDIC insured up to $8M'],
  },
  {
    institution: 'Marcus by Goldman Sachs',
    type: 'HYSA',
    apy: 4.40,
    minDeposit: 0,
    fdic: true,
    url: 'https://www.marcus.com/us/en/savings/high-yield-savings',
    features: ['No fees', 'Easy transfers', 'Mobile app'],
  },
  {
    institution: 'Ally Bank',
    type: 'HYSA',
    apy: 4.25,
    minDeposit: 0,
    fdic: true,
    url: 'https://www.ally.com/bank/online-savings-account/',
    features: ['No minimum', 'Buckets feature', '24/7 support'],
  },
  {
    institution: 'SoFi',
    type: 'HYSA',
    apy: 4.20,
    minDeposit: 0,
    fdic: true,
    url: 'https://www.sofi.com/banking/',
    features: ['No fees', 'Up to 4.20% with direct deposit', 'Vaults'],
  },
  {
    institution: 'Capital One 360',
    type: 'HYSA',
    apy: 4.10,
    minDeposit: 0,
    fdic: true,
    url: 'https://www.capitalone.com/bank/savings-accounts/online-performance-savings-account/',
    features: ['No fees', 'No minimum', 'Strong mobile app'],
  },
  {
    institution: 'Discover',
    type: 'HYSA',
    apy: 4.00,
    minDeposit: 0,
    fdic: true,
    url: 'https://www.discover.com/online-banking/savings-account/',
    features: ['No fees', 'Cash back debit card', 'Online tools'],
  },
  // Money Market Accounts
  {
    institution: 'Vanguard',
    symbol: 'VMFXX',
    type: 'Money Market',
    apy: 4.75,
    minDeposit: 3000,
    fdic: false,
    url: 'https://investor.vanguard.com/investment-products/mutual-funds/profile/vmfxx',
    features: ['7-day SEC yield', 'Government securities', 'Low expense ratio'],
  },
  {
    institution: 'Fidelity',
    symbol: 'FDRXX',
    type: 'Money Market',
    apy: 4.70,
    minDeposit: 0,
    fdic: false,
    url: 'https://fundresearch.fidelity.com/mutual-funds/summary/316067107',
    features: ['7-day yield', 'No minimum', 'Government fund'],
  },
  {
    institution: 'Schwab',
    symbol: 'SWVXX',
    type: 'Money Market',
    apy: 4.65,
    minDeposit: 0,
    fdic: false,
    url: 'https://www.schwab.com/money-market-funds',
    features: ['7-day yield', 'Value Advantage', 'Easy access'],
  },
  // CDs
  {
    institution: 'Marcus by Goldman Sachs',
    type: 'CD',
    apy: 4.50,
    minDeposit: 500,
    term: '12 months',
    fdic: true,
    url: 'https://www.marcus.com/us/en/savings/high-yield-cds',
    features: ['No early withdrawal penalty CD option', '10-day CD rate guarantee'],
  },
  {
    institution: 'Ally Bank',
    type: 'CD',
    apy: 4.35,
    minDeposit: 0,
    term: '12 months',
    fdic: true,
    url: 'https://www.ally.com/bank/cd-rates/',
    features: ['No minimum', 'Raise Your Rate option', 'No Penalty CD'],
  },
  {
    institution: 'Discover',
    type: 'CD',
    apy: 4.30,
    minDeposit: 2500,
    term: '12 months',
    fdic: true,
    url: 'https://www.discover.com/online-banking/cd/',
    features: ['Flexible terms', 'No fees to open', 'Online management'],
  },
  {
    institution: 'Capital One',
    type: 'CD',
    apy: 4.25,
    minDeposit: 0,
    term: '12 months',
    fdic: true,
    url: 'https://www.capitalone.com/bank/cds/',
    features: ['No minimum', 'Multiple term options', 'Easy rollover'],
  },
  {
    institution: 'Synchrony Bank',
    type: 'CD',
    apy: 4.55,
    minDeposit: 0,
    term: '12 months',
    fdic: true,
    url: 'https://www.synchronybank.com/banking/cd/',
    features: ['No minimum', 'Bump-up CD option', 'ATM card available'],
  },
  {
    institution: 'Barclays',
    type: 'CD',
    apy: 4.40,
    minDeposit: 0,
    term: '12 months',
    fdic: true,
    url: 'https://www.barclays.us/cd/',
    features: ['No minimum', 'Online management', 'Auto-renewal'],
  },
];

type FilterType = 'all' | 'HYSA' | 'CD' | 'Money Market';

export default function SavingsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'apy' | 'institution'>('apy');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = SAVINGS_PRODUCTS
    .filter((p) => filter === 'all' || p.type === filter)
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.institution.toLowerCase().includes(query) ||
        p.symbol?.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query) ||
        p.features?.some((f) => f.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'apy') return b.apy - a.apy;
      return a.institution.localeCompare(b.institution);
    });

  const bestHYSA = SAVINGS_PRODUCTS.filter((p) => p.type === 'HYSA').sort((a, b) => b.apy - a.apy)[0];
  const bestCD = SAVINGS_PRODUCTS.filter((p) => p.type === 'CD').sort((a, b) => b.apy - a.apy)[0];
  const bestMM = SAVINGS_PRODUCTS.filter((p) => p.type === 'Money Market').sort((a, b) => b.apy - a.apy)[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">High-Yield Savings & CDs</h1>
        <p className="text-slate-400 mt-1">Compare the best rates for your cash</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <PiggyBank className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Best HYSA Rate</p>
              <p className="text-xl font-bold text-green-500">{bestHYSA?.apy.toFixed(2)}% APY</p>
              <p className="text-xs text-slate-500">{bestHYSA?.institution}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Best 12-Month CD</p>
              <p className="text-xl font-bold text-blue-500">{bestCD?.apy.toFixed(2)}% APY</p>
              <p className="text-xs text-slate-500">{bestCD?.institution}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Best Money Market</p>
              <p className="text-xl font-bold text-purple-500">{bestMM?.apy.toFixed(2)}% APY</p>
              <p className="text-xs text-slate-500">{bestMM?.institution}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200/80">
          <p className="font-medium text-amber-200 mb-1">Rate Disclaimer</p>
          <p>
            Rates shown are approximate and subject to change. APYs are based on publicly available information
            and may vary based on account balance, membership, or promotional periods. Always verify current
            rates directly with the institution before opening an account.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by institution, symbol, or feature..."
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Type:</span>
          <div className="flex gap-1">
            {(['all', 'HYSA', 'CD', 'Money Market'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                )}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'apy' | 'institution')}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="apy">Highest APY</option>
            <option value="institution">Institution</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  Institution
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  Symbol
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  Type
                </th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  APY
                </th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  Min. Deposit
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  Term
                </th>
                <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  FDIC
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  Features
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.map((product, index) => (
                <tr
                  key={`${product.institution}-${product.type}-${index}`}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg">
                        <Building2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-medium text-slate-100">{product.institution}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {product.symbol ? (
                      <span className="font-mono text-sm text-blue-400">{product.symbol}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded',
                        product.type === 'HYSA' && 'bg-green-500/10 text-green-400',
                        product.type === 'CD' && 'bg-blue-500/10 text-blue-400',
                        product.type === 'Money Market' && 'bg-purple-500/10 text-purple-400'
                      )}
                    >
                      {product.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-green-500">{product.apy.toFixed(2)}%</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    {product.minDeposit === 0 ? '$0' : `$${product.minDeposit.toLocaleString()}`}
                  </td>
                  <td className="px-6 py-4 text-slate-300">{product.term || 'N/A'}</td>
                  <td className="px-6 py-4 text-center">
                    {product.fdic ? (
                      <span className="text-green-500 text-sm">Yes</span>
                    ) : (
                      <span className="text-slate-500 text-sm">No*</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {product.features?.slice(0, 2).map((feature, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                      Learn More
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <p className="text-slate-400">No products match your search criteria</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilter('all');
                      }}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <p className="text-xs text-slate-500">
        * Money market funds are not FDIC insured but may be invested in government securities.
        APYs shown are 7-day SEC yields for money market funds. Rates last updated: January 2026.
      </p>
    </div>
  );
}
