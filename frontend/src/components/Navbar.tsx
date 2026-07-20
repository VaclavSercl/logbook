'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const navItems = [
    { label: 'Deníky', href: '/logbook', icon: '📖' },
    { label: 'Lodě', href: '/vessels', icon: '⛵' },
    { label: 'Posádka & Služby', href: '/crew', icon: '👥' },
    { label: 'Meteo & Synoptika', href: '/weather', icon: '🌤️' },
    { label: 'Kotvení & Alarm', href: '/anchoring', icon: '⚓' },
    { label: 'Lodní Pokladna', href: '/cashbox', icon: '💰' },
    { label: 'Mapa & AIS', href: '/map', icon: '🗺️' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">⚓</span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Logbook
            </span>
          </Link>

          {token && (
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setLang('cs')}
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                lang === 'cs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CS
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                lang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          <Link
            href="/help"
            className="text-slate-300 hover:text-white text-sm font-medium flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-800"
            title="Nápověda"
          >
            <span>❓</span>
            <span className="hidden sm:inline">Nápověda</span>
          </Link>

          {token ? (
            <div className="flex items-center space-x-2">
              <Link
                href="/settings"
                className="text-slate-300 hover:text-white text-sm font-medium px-2 py-1 rounded hover:bg-slate-800"
                title="Nastavení"
              >
                ⚙️
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-950/60 border border-red-800/50 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-900/80 transition-all"
              >
                Odhlásit
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-sm"
              >
                Přihlásit
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar */}
      {token && (
        <div className="lg:hidden flex overflow-x-auto border-t border-slate-800 px-4 py-2 space-x-2 no-scrollbar">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  active
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
