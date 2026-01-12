'use client';

import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  HelpCircle,
  ChevronRight,
  Moon,
  Sun,
  Mail,
  Key,
  Smartphone,
  Globe,
  Clock,
  TrendingUp,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      <div className="divide-y divide-slate-800">{children}</div>
    </div>
  );
}

interface SettingsRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

function SettingsRow({ icon: Icon, label, description, children, onClick }: SettingsRowProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'w-full flex items-center justify-between px-6 py-4',
        onClick && 'hover:bg-slate-800/50 transition-colors text-left cursor-pointer'
      )}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-slate-800 rounded-lg">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="font-medium text-slate-200">{label}</p>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {children || (onClick && <ChevronRight className="w-5 h-5 text-slate-600" />)}
    </div>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        enabled ? 'bg-blue-600' : 'bg-slate-700'
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
          enabled && 'translate-x-5'
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [signalAlerts, setSignalAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [marketOpen, setMarketOpen] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <SettingsSection title="Profile" description="Your personal information">
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-slate-100">User Profile</h4>
              <p className="text-slate-500">user@example.com</p>
              <button className="mt-2 text-sm text-blue-500 hover:text-blue-400">
                Change avatar
              </button>
            </div>
          </div>
        </div>

        <SettingsRow icon={User} label="Display Name" description="Your public display name">
          <input
            type="text"
            defaultValue="Trader"
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 text-right"
          />
        </SettingsRow>

        <SettingsRow icon={Mail} label="Email Address" description="Your account email">
          <span className="text-slate-400 text-sm">user@example.com</span>
        </SettingsRow>

        <SettingsRow icon={Globe} label="Timezone" description="Used for market hours display">
          <select className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="America/New_York">Eastern (ET)</option>
            <option value="America/Chicago">Central (CT)</option>
            <option value="America/Denver">Mountain (MT)</option>
            <option value="America/Los_Angeles">Pacific (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* Appearance Section */}
      <SettingsSection title="Appearance" description="Customize how Apex Alpha looks">
        <SettingsRow icon={darkMode ? Moon : Sun} label="Dark Mode" description="Use dark theme throughout the app">
          <Toggle enabled={darkMode} onChange={setDarkMode} />
        </SettingsRow>

        <SettingsRow icon={Palette} label="Accent Color" description="Primary color for highlights">
          <div className="flex items-center gap-2">
            {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'].map((color) => (
              <button
                key={color}
                className={cn(
                  'w-6 h-6 rounded-full',
                  color,
                  color === 'bg-blue-500' && 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                )}
              />
            ))}
          </div>
        </SettingsRow>

        <SettingsRow icon={TrendingUp} label="Chart Style" description="Default chart appearance">
          <select className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="area">Area</option>
            <option value="line">Line</option>
            <option value="candlestick">Candlestick</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection title="Notifications" description="How you receive alerts and updates">
        <SettingsRow icon={Mail} label="Email Notifications" description="Receive updates via email">
          <Toggle enabled={emailNotifications} onChange={setEmailNotifications} />
        </SettingsRow>

        <SettingsRow icon={Smartphone} label="Push Notifications" description="Browser push notifications">
          <Toggle enabled={pushNotifications} onChange={setPushNotifications} />
        </SettingsRow>

        <SettingsRow icon={Bell} label="Signal Alerts" description="Get notified of new trading signals">
          <Toggle enabled={signalAlerts} onChange={setSignalAlerts} />
        </SettingsRow>

        <SettingsRow icon={TrendingUp} label="Price Alerts" description="Alerts when prices hit targets">
          <Toggle enabled={priceAlerts} onChange={setPriceAlerts} />
        </SettingsRow>

        <SettingsRow icon={Clock} label="Market Open/Close" description="Daily market status alerts">
          <Toggle enabled={marketOpen} onChange={setMarketOpen} />
        </SettingsRow>
      </SettingsSection>

      {/* Security Section */}
      <SettingsSection title="Security" description="Protect your account">
        <SettingsRow icon={Key} label="Change Password" description="Update your password" onClick={() => {}}>
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </SettingsRow>

        <SettingsRow icon={Shield} label="Two-Factor Authentication" description="Add an extra layer of security">
          <Toggle enabled={twoFactor} onChange={setTwoFactor} />
        </SettingsRow>

        <SettingsRow icon={Smartphone} label="Active Sessions" description="Manage your logged in devices" onClick={() => {}}>
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </SettingsRow>
      </SettingsSection>

      {/* Data & Privacy Section */}
      <SettingsSection title="Data & Privacy" description="Manage your data">
        <SettingsRow icon={Database} label="Export Data" description="Download your watchlists and settings" onClick={() => {}}>
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </SettingsRow>

        <SettingsRow icon={Database} label="Clear Cache" description="Clear locally stored data" onClick={() => {}}>
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </SettingsRow>
      </SettingsSection>

      {/* Help & Support Section */}
      <SettingsSection title="Help & Support">
        <SettingsRow icon={HelpCircle} label="Help Center" description="Browse FAQs and guides" onClick={() => {}}>
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </SettingsRow>

        <SettingsRow icon={Mail} label="Contact Support" description="Get help from our team" onClick={() => {}}>
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </SettingsRow>
      </SettingsSection>

      {/* Danger Zone */}
      <div className="bg-slate-900 rounded-lg border border-red-900/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-900/50">
          <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
          <p className="text-sm text-slate-500 mt-1">Irreversible actions</p>
        </div>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-200">Delete Account</p>
            <p className="text-sm text-slate-500">Permanently delete your account and all data</p>
          </div>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
            Delete Account
          </button>
        </div>
      </div>

      {/* Sign Out Button */}
      <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      {/* App Version */}
      <p className="text-center text-sm text-slate-600">
        Apex Alpha v1.0.0
      </p>
    </div>
  );
}
