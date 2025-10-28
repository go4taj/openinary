'use client';

import React, { useEffect, useState } from 'react';
import SideMenu from './ui/side-menu';
import Header from './ui/header';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      if (typeof window !== 'undefined') window.location.href = '/';
      return;
    }

    (async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const res = await fetch(apiBase ? `${apiBase}/me` : `/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          localStorage.removeItem('token');
          if (typeof window !== 'undefined') window.location.href = '/';
          return;
        }
        const data = await res.json();
        setUsername(data.username || null);
      } catch (err) {
        localStorage.removeItem('token');
        if (typeof window !== 'undefined') window.location.href = '/';
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <SideMenu onSignOut={() => setUsername(null)} userEmail={username} />
      <main className="flex-1">
        <Header username={username} />
        {children}
      </main>
    </div>
  );
}
