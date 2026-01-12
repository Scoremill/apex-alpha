'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 pt-16',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
