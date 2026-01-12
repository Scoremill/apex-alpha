'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useOwnedAssets } from '@/hooks/useOwnedAssets';

export interface Notification {
  id: string;
  type: 'signal' | 'price' | 'news' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  symbol?: string;
  changePercent?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { assets, isLoaded } = useOwnedAssets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [checkedSymbols, setCheckedSymbols] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function checkPriceAlerts() {
      if (!isLoaded || assets.length === 0) return;

      const symbols = assets.map((a) => a.symbol).join(',');
      
      try {
        const response = await fetch(`/api/market-data?symbols=${symbols}`);
        if (!response.ok) return;
        
        const marketData = await response.json();
        const newNotifications: Notification[] = [];
        const now = new Date();

        assets.forEach((asset) => {
          const data = marketData[asset.symbol];
          if (!data) return;

          const changePercent = data.changePercent || 0;
          const absChange = Math.abs(changePercent);
          
          if (absChange >= 3) {
            const notificationId = `price-${asset.symbol}-${now.toDateString()}`;
            
            if (!checkedSymbols.has(notificationId)) {
              const isUp = changePercent > 0;
              newNotifications.push({
                id: notificationId,
                type: 'price',
                title: `${isUp ? '📈' : '📉'} ${asset.symbol} ${isUp ? 'Up' : 'Down'} ${absChange.toFixed(1)}%`,
                message: `${asset.name} is ${isUp ? 'up' : 'down'} ${absChange.toFixed(2)}% today. Current price: $${data.price?.toFixed(2)}`,
                time: 'Just now',
                read: false,
                symbol: asset.symbol,
                changePercent,
              });
              setCheckedSymbols((prev) => new Set([...prev, notificationId]));
            }
          }
        });

        if (newNotifications.length > 0) {
          setNotifications((prev) => [...newNotifications, ...prev].slice(0, 20));
        }
      } catch (error) {
        console.error('Error checking price alerts:', error);
      }
    }

    checkPriceAlerts();
    const interval = setInterval(checkPriceAlerts, 60 * 1000);
    return () => clearInterval(interval);
  }, [isLoaded, assets, checkedSymbols]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
