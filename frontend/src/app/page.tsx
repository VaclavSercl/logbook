'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi } from '@/lib/api';

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

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    if (!token) return;
    dashboardApi.getStats(token)
      .then(setStats)
      .catch(console.error);
  }, [token]);

  // ─── HYDRATION/LOADING STATE ───
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#08090a]" />
    );
  }

  // ─── LANDING PAGE (NOT LOGGED IN) ───
  if (!token) {
    return (
      <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] relative overflow-hidden font-sans selection:bg-[#5e6ad2]/30 selection:text-white">
        {/* Google Fonts Link styled with Inter & JetBrains Mono */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;510;590;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        
        {/* Style injection for global geometric font features */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-feature-settings: 'cv01', 'ss03';
            background-color: #08090a;
          }
          .font-mono-custom {
            font-family: 'JetBrains Mono', monospace;
          }
        `}} />

        {/* Luminous Background Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#5e6ad2]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#7170ff]/4 blur-[140px] pointer-events-none" />

        {/* ── Header ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#08090a]/80 backdrop-blur-md border-b border-white/[0.05] px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-[#5e6ad2] to-[#7170ff] rounded-md flex items-center justify-center text-[13px] font-semibold text-white tracking-tight shadow-lg shadow-[#5e6ad2]/20">⚓</div>
            <span className="text-sm font-medium tracking-tight text-[#f7f8f8]">LOGBOOK</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition px-3 py-1.5 rounded-md hover:bg-white/[0.04]">
              Přihlásit se
            </Link>
            <Link href="/register" className="text-xs font-medium bg-[#5e6ad2] hover:bg-[#828fff] text-white transition px-4 py-2 rounded-md shadow-lg shadow-[#5e6ad2]/20">
              Registrovat
            </Link>
          </div>
        </nav>

        {/* ── Hero Section ── */}
        <section className="pt-32 pb-16 px-6 text-center max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7170ff] bg-[#5e6ad2]/10 border border-[#7170ff]/20 rounded-full px-3 py-1 mb-6 tracking-tight">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7170ff] animate-pulse" />
            Server Čáslav — Připraven k plavbě
          </div>
          <h1 className="text-5xl md:text-6xl font-medium leading-[1.05] tracking-[-1.5px] mb-6 bg-gradient-to-b from-[#f7f8f8] to-[#d0d6e0] bg-clip-text text-transparent">
            Inteligentní lodní deník<br />pro moderní mořeplavce.
          </h1>
          <p className="text-base md:text-lg text-[#8a8f98] leading-relaxed max-w-xl mx-auto mb-10 tracking-tight">
            Profesionální námořní SaaS platforma s integrovaným AI generátorem, kaskádovou správou flotily a interaktivními mapami OpenSeaMap. Splňuje IMO standardy.
          </p>
          <div className="flex items-center justify-center gap-4 mb-20">
            <Link href="/login" className="px-6 py-3 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-sm font-medium rounded-md transition shadow-xl shadow-[#5e6ad2]/15">
              Vstoupit do deníku
            </Link>
            <Link href="/register" className="px-6 py-3 bg-white/[0.02] hover:bg-white/[0.05] text-[#f7f8f8] text-sm font-medium rounded-md border border-white/[0.08] transition">
              Založit účet flotily
            </Link>
          </div>

          {/* ── High-Fidelity Mock Browser UI ── */}
          <div className="w-full max-w-3xl mx-auto bg-[#0f1011] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/80 relative text-left">
            {/* Window chrome */}
            <div className="h-10 bg-[#0f1011] border-b border-white/[0.05] px-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/[0.05] border border-white/[0.05]" />
                <div className="w-3 h-3 rounded-full bg-white/[0.05] border border-white/[0.05]" />
                <div className="w-3 h-3 rounded-full bg-white/[0.05] border border-white/[0.05]" />
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-md px-16 py-1 text-[10px] font-mono-custom text-[#62666d]">
                http://100.115.65.19:3001/logbook
              </div>
              <div className="w-6" />
            </div>

            {/* Mock Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 h-80">
              {/* Left Column (Navigation & Stats) */}
              <div className="border-r border-white/[0.05] p-5 bg-[#0f1011] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-5 h-5 bg-[#5e6ad2]/20 text-[#7170ff] rounded flex items-center justify-center text-xs font-bold">⚓</div>
                    <span className="text-xs font-semibold text-[#f7f8f8] tracking-tight">MY FLOTILA</span>
                  </div>
                  <div className="space-y-1">
                    <div className="px-3 py-2 bg-white/[0.03] border border-white/[0.05] rounded-md text-xs font-medium text-[#f7f8f8] flex items-center justify-between">
                      <span>Sailing Yacht 'Čáslav'</span>
                      <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white/[0.01] border border-white/[0.05] rounded-lg p-3">
                    <span className="text-[10px] text-[#62666d] block font-mono-custom uppercase">Aktuální rychlost</span>
                    <span className="text-xl font-semibold text-[#f7f8f8]">6.8 kn</span>
                  </div>
                  <div className="bg-white/[0.01] border border-white/[0.05] rounded-lg p-3">
                    <span className="text-[10px] text-[#62666d] block font-mono-custom uppercase">Počasí na pozici</span>
                    <span className="text-xs text-[#d0d6e0] font-medium flex items-center gap-1.5 mt-0.5">
                      <span>🌤️ NW 12 uzlů</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Content (Logbook List) */}
              <div className="col-span-2 p-5 bg-[#08090a]/50 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/[0.05] pb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">Chronologický zápis deníku</h3>
                    <span className="text-[10px] font-mono-custom text-[#62666d]">4. června 2026</span>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-[#7170ff] font-medium font-mono-custom">10:00 UTC · Vyplutí</span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#10b981]/10 text-[#10b981] rounded-full font-mono-custom">IMO Valid</span>
                      </div>
                      <p className="text-xs text-[#d0d6e0] leading-relaxed">
                        Vyplutí z mariny Rafina (37°55'N, 23°40'E). Vítr NW 12 uzlů, stav moře mírný, tlak 1013 hPa. Všechny lodní systémy zelené.
                      </p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 opacity-60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-[#8a8f98] font-medium font-mono-custom">12:00 UTC · Plavba</span>
                      </div>
                      <p className="text-xs text-[#d0d6e0]">
                        Plavba na kurz 175°, rychlost 6,8 uzlu. Pozice 37°51'N, 23°43'E. Urazeno 8.2 NM za 2 hodiny.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.05] pt-3 text-[10px] font-mono-custom text-[#62666d]">
                  <span>Hash integrity: sha256:078b2...</span>
                  <span className="text-[#10b981]">● Zámek aktivní</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section className="max-w-5xl mx-auto px-6 pb-24 relative z-10">
          <div className="text-xs font-semibold text-[#62666d] uppercase tracking-wider mb-8 text-center">Špičkové technologie pro bezpečnost na moři</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1 */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 hover:bg-white/[0.03] hover:border-white/[0.1] transition group">
              <div className="w-10 h-10 rounded-lg bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#7170ff] flex items-center justify-center text-lg mb-5 group-hover:scale-105 transition">📖</div>
              <h3 className="text-sm font-semibold tracking-tight text-[#f7f8f8] mb-2">IMO Compliant Lodní Deník</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                Plně odpovídá českému námořnímu zákonu 61/2000 Sb. a vyhlášce 278/2000 Sb. Automatický audit trail a neměnné, kryptograficky jištěné záznamy, které nelze pozměnit bez stopy.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 hover:bg-white/[0.03] hover:border-white/[0.1] transition group">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] flex items-center justify-center text-lg mb-5 group-hover:scale-105 transition">🗺️</div>
              <h3 className="text-sm font-semibold tracking-tight text-[#f7f8f8] mb-2">Interaktivní námořní mapy</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                Renderování trasy plavby pomocí MapLibre GL s kompletními mapovými vrstvami: OpenStreetMap, satelitní snímky a námořní podklady OpenSeaMap (majáky, bójky a hloubky).
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 hover:bg-white/[0.03] hover:border-white/[0.1] transition group">
              <div className="w-10 h-10 rounded-lg bg-[#7170ff]/10 border border-[#7170ff]/20 text-[#7170ff] flex items-center justify-center text-lg mb-5 group-hover:scale-105 transition">🤖</div>
              <h3 className="text-sm font-semibold tracking-tight text-[#f7f8f8] mb-2">Hybridní AI generátor</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                Inteligentní cloud-first psaní námořních hlášení s využitím Gemini 2.5 API a okamžitým, deterministickým offline fallbackem při plavbě bez internetového signálu.
              </p>
            </div>

          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[0.05] max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-xs text-[#62666d]">
          <p>caslav · logbook · Raspberry Pi 4 · Ubuntu 25.10</p>
          <p className="font-mono-custom text-[11px] mt-2 md:mt-0 text-[#8a8f98]">LOGBOOK PLATFORM v1.1.0 · MIT LICENCE</p>
        </footer>
      </div>
    );
  }

  // ─── LOGGED IN DASHBOARD (AUTHENTICATED) ───
  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] font-sans selection:bg-[#5e6ad2]/30 selection:text-white">
      {/* Google Fonts Link styled with Inter & JetBrains Mono */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;510;590;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      
      {/* Style injection for global geometric font features */}
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-feature-settings: 'cv01', 'ss03';
          background-color: #08090a;
        }
        .font-mono-custom {
          font-family: 'JetBrains Mono', monospace;
        }
      `}} />

      {/* Header */}
      <header className="bg-[#0f1011] border-b border-white/[0.05] px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 text-decoration-none group">
            <div className="w-6 h-6 bg-gradient-to-br from-[#5e6ad2] to-[#7170ff] rounded-md flex items-center justify-center text-xs font-semibold text-white shadow-md shadow-[#5e6ad2]/10 group-hover:scale-105 transition">⚓</div>
            <h1 className="text-sm font-semibold tracking-tight text-[#f7f8f8]">LOGBOOK</h1>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/logbook" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Deník</Link>
            <Link href="/map" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Mapa</Link>
            <Link href="/weather" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Počasí</Link>
            <Link href="/vessels" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Plavidla</Link>
            <Link href="/crew" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Posádka</Link>
            <Link href="/settings" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Nastavení</Link>
            <Link href="/help" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-3 py-2 rounded-md hover:bg-white/[0.04] transition">Nápověda</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-6xl mx-auto pt-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-[#f7f8f8]">Vítej na palubě</h2>
            <p className="text-xs text-[#8a8f98] mt-1">Kompletní správa Vaší námořní flotily z Čáslavi.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/logbook?showForm=true"
              className="px-4 py-2 bg-[#0f1011] hover:bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-[#f7f8f8] rounded-md transition"
            >
              + Nový lodní deník
            </Link>
            <Link
              href="/logbook/new"
              className="px-4 py-2 bg-[#5e6ad2] hover:bg-[#828fff] text-xs font-medium text-white rounded-md transition shadow-md shadow-[#5e6ad2]/10"
            >
              + Nový záznam plavby
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Plavidla ve flotile" value={stats.vessels} icon="🚢" label="Aktivní lodě" />
          <StatCard title="Lodní deníky" value={stats.logbooks} icon="📖" label="Knihy plaveb" />
          <StatCard title="Záznamy plavby" value={stats.entries} icon="📝" label="Zapsané body" />
          <StatCard title="Aktivní moduly" value={stats.activeModules} icon="🧩" label="Systémové Pluginy" />
        </div>

        {/* Quick Actions Title */}
        <h3 className="text-xs font-semibold text-[#62666d] uppercase tracking-wider mb-4">Rychlé akce</h3>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickAction title="Nový deník" description="Založit novou knihu plavby" href="/logbook?showForm=true" icon="📖" />
          <QuickAction title="Nový záznam" description="Přidat zápis do deníku" href="/logbook/new" icon="📝" />
          <QuickAction title="Zobrazit mapu" description="GPS trasa a OpenSeaMap" href="/map" icon="🗺️" />
          <QuickAction title="Správa plavidel" description="Seznam lodí a rozměry" href="/vessels" icon="🚢" />
          <QuickAction title="Konfigurace modulů" description="Nastavení pluginů a PWA" href="/settings" icon="⚙️" />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, label }: { title: string; value: number; icon: string; label: string }) {
  return (
    <div className="bg-[#0f1011] border border-white/[0.08] rounded-xl p-5 relative overflow-hidden group hover:border-white/[0.12] transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-[#62666d] uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-semibold text-[#f7f8f8] mt-2 tracking-tight">{value}</p>
          <span className="text-[10px] text-[#10b981] font-mono-custom mt-1 inline-flex items-center gap-1.5 bg-[#10b981]/10 px-2 py-0.5 rounded-full">
            <span className="w-1 h-1 rounded-full bg-[#10b981]" />
            {label}
          </span>
        </div>
        <span className="text-3xl bg-white/[0.02] border border-white/[0.05] w-12 h-12 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition">{icon}</span>
      </div>
    </div>
  );
}

function QuickAction({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link
      href={href}
      className="bg-[#0f1011] border border-white/[0.08] rounded-xl p-5 hover:border-[#7170ff]/30 hover:bg-white/[0.01] transition group relative overflow-hidden flex flex-col justify-between h-32"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-[#62666d] font-mono-custom opacity-0 group-hover:opacity-100 group-hover:text-[#7170ff] transition">GO →</span>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-[#f7f8f8] group-hover:text-[#7170ff] transition tracking-tight">{title}</h4>
        <p className="text-[11px] text-[#8a8f98] mt-1 leading-normal">{description}</p>
      </div>
    </Link>
  );
}
