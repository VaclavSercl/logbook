'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  vessels: number;
  logbooks: number;
  entries: number;
  activeModules: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    vessels: 0,
    logbooks: 0,
    entries: 0,
    activeModules: 0,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    // Fetch stats from API
    // TODO: implement stats endpoint
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-100 mb-2">⚓ Logbook</h1>
          <p className="text-slate-400 mb-8">Smart AI Maritime Logbook Platform</p>
          <div className="space-x-4">
            <Link
              href="/login"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Přihlásit se
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
            >
              Registrovat
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">⚓ Logbook</h1>
          <nav className="flex items-center gap-4">
            <Link href="/logbook" className="text-slate-300 hover:text-white transition">Deník</Link>
            <Link href="/map" className="text-slate-300 hover:text-white transition">Mapa</Link>
            <Link href="/weather" className="text-slate-300 hover:text-white transition">Počasí</Link>
            <Link href="/crew" className="text-slate-300 hover:text-white transition">Posádka</Link>
            <Link href="/settings" className="text-slate-300 hover:text-white transition">Nastavení</Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Plavidla" value={stats.vessels} icon="🚢" />
          <StatCard title="Deníky" value={stats.logbooks} icon="📖" />
          <StatCard title="Záznamy" value={stats.entries} icon="📝" />
          <StatCard title="Moduly" value={stats.activeModules} icon="🧩" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction title="Nový záznam" description="Přidat zápis do deníku" href="/logbook/new" />
          <QuickAction title="Zobrazit mapu" description="GPS trasa a pozice" href="/map" />
          <QuickAction title="AI Asistent" description="Generovat zápis" href="/ai" />
          <QuickAction title="Export PDF" description="Stáhnout deník" href="/export" />
          <QuickAction title="Počasí" description="Aktuální podmínky" href="/weather" />
          <QuickAction title="Nastavení" description="Konfigurace" href="/settings" />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-slate-100">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function QuickAction({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-blue-500 transition group"
    >
      <h3 className="text-slate-100 font-medium group-hover:text-blue-400 transition">{title}</h3>
      <p className="text-slate-400 text-sm mt-1">{description}</p>
    </Link>
  );
}
