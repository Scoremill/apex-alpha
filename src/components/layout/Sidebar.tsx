'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  List,
  Signal,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Bitcoin,
  Wallet,
  Gem,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Markets', href: '/markets', icon: LineChart },
  { label: 'Commodities', href: '/commodities', icon: Gem },
  { label: 'Signals', href: '/signals', icon: Signal },
  { label: 'Owned Assets', href: '/owned-assets', icon: Wallet, badge: 'New' },
  { label: 'Crypto', href: '/crypto', icon: Bitcoin },
  { label: 'Savings', href: '/savings', icon: PiggyBank },
  { label: 'Watchlists', href: '/watchlist', icon: List },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help', href: '/help', icon: HelpCircle },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  isOpen = true,
  onClose,
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();

  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] z-40',
          'bg-slate-950 border-r border-slate-800',
          'transition-all duration-300 ease-in-out',
          'flex flex-col',
          collapsed ? 'w-16' : 'w-64',
          // Mobile: hidden by default, shown when isOpen
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200',
                  'group relative',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-blue-400')} />
                {!collapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600 text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-800 text-slate-100 text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Items */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200',
                  'group relative',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}

                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-800 text-slate-100 text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'hidden md:flex items-center justify-center',
            'absolute -right-3 top-8',
            'h-6 w-6 rounded-full',
            'bg-slate-800 border border-slate-700',
            'text-slate-400 hover:text-slate-100',
            'transition-colors'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>
    </>
  );
}

export default Sidebar;
