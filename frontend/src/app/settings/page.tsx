'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { modulesApi } from '@/lib/api';

interface Module {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  icon: string;
  is_active: boolean;
  is_installed: boolean;
}

export default function SettingsPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('cs');
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

  // 1. Fetch modules list
  const fetchModules = async () => {
    if (!mounted || !token) return;
    setLoading(true);
    try {
      const data = await modulesApi.list(token);
      setModules(data as Module[]);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && token) {
      fetchModules();
    }
  }, [mounted, token]);

  // 2. Toggle module activation
  const handleToggleModule = async (mod: Module) => {
    if (!token) return;
    try {
      if (!mod.is_installed) {
        await modulesApi.install(mod.id, token);
      }
      if (mod.is_active) {
        await modulesApi.deactivate(mod.id, token);
      } else {
        await modulesApi.activate(mod.id, token);
      }
      fetchModules();
    } catch (err) {
      console.error('Failed to toggle module:', err);
      alert('Chyba při změně nastavení modulu.');
    }
  };

  // Hydration state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900" />
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení nastavení se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm font-medium transition flex items-center gap-1.5">
          🏠 Domů
        </Link>
        <Link href="/help" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm font-medium transition flex items-center gap-1.5">
          ⚓ Nápověda
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">⚙️ Nastavení</h1>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-8">
        {/* Language */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700/60 shadow">
          <h2 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">🌐 Jazyk platformy</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cs">Čeština</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="hr">Hrvatski</option>
            <option value="it">Italiano</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </section>

        {/* Theme */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700/60 shadow">
          <h2 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">🎨 Barevné schéma</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 px-4 py-3 rounded-lg border font-medium text-sm transition ${
                theme === 'dark'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/15'
                  : 'bg-slate-750 border-slate-700 text-slate-300 hover:border-slate-650'
              }`}
            >
              🌙 Tmavé (doporučeno)
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 px-4 py-3 rounded-lg border font-medium text-sm transition ${
                theme === 'light'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/15'
                  : 'bg-slate-750 border-slate-700 text-slate-300 hover:border-slate-650'
              }`}
            >
              ☀️ Světlé
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700/60 shadow">
          <h2 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">🔔 Upozornění</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500/40"
            />
            <span className="text-slate-300 text-sm">Povolit automatické push notifikace stavu plavby</span>
          </label>
        </section>

        {/* Modules */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700/60 shadow">
          <h2 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">🧩 Systémové moduly</h2>
          {loading ? (
            <p className="text-slate-400 text-sm">Načítám moduly...</p>
          ) : (
            <div className="space-y-3">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between bg-slate-750 rounded-lg p-4 border border-slate-700/50 hover:border-slate-650 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{mod.icon || '📦'}</span>
                      <p className="text-slate-100 font-semibold text-sm">{mod.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">v{mod.version}</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{mod.description || 'Žádný popis.'}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mod.is_active}
                      onChange={() => handleToggleModule(mod)}
                      disabled={mod.slug === 'logbook' || mod.slug === 'gps'}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Save */}
        <button
          onClick={() => alert('Nastavení uloženo.')}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition shadow-lg shadow-blue-500/15"
        >
          Uložit veškeré změny
        </button>
      </main>
    </div>
  );
}
