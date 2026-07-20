'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi, publicApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { formatVesselSpeed, formatWindSpeed, formatDistance, formatDepth, formatPressure } from '@/lib/units';

interface DashboardStats {
  vessels: number;
  logbooks: number;
  entries: number;
  activeModules: number;
}

const RANDOM_VOYAGES = [
  {
    vessel: "Sailing Yacht 'Čáslav'",
    speed: formatVesselSpeed(6.8),
    weather: `🌤️ NW ${formatWindSpeed(12)}`,
    date: "17. července 2026",
    hash: "sha256:078b2d49a...",
    entries: [
      {
        time: "10:00 UTC",
        category: "Vyplutí",
        notes: `Vyplutí z mariny Rafina (37°55'N, 23°40'E). Vítr NW ${formatWindSpeed(12)}, stav moře mírný, tlak ${formatPressure(1013)}. Všechny lodní systémy zelené.`,
        locked: true,
      },
      {
        time: "12:00 UTC",
        category: "Plavba",
        notes: `Plavba na kurz 175°, rychlost ${formatVesselSpeed(6.8)}. Pozice 37°51'N, 23°43'E. Urazeno ${formatDistance(8.2)} za 2 hodiny.`,
        locked: false,
      }
    ]
  },
  {
    vessel: "Ketch 'Njoror'",
    speed: formatVesselSpeed(5.4),
    weather: `🌧️ S ${formatWindSpeed(18)}`,
    date: "17. července 2026",
    hash: "sha256:8f4c029a1...",
    entries: [
      {
        time: "08:15 UTC",
        category: "Příprava",
        notes: `Kontrola lanoví a motoru v marině ACI Split. Tlak vzduchu klesá na ${formatPressure(1009)}, hlášen déšť. Posádka obléká nepromokavé obleky.`,
        locked: true,
      },
      {
        time: "09:45 UTC",
        category: "Plavba",
        notes: `Plavba pod bouřkovou kosatkou a refovanou hlavní plachtou. Kurz 210° směr Hvar. Vlny 1.5m, silný boční vítr ${formatWindSpeed(18)}.`,
        locked: false,
      }
    ]
  },
  {
    vessel: "Catamaran 'Solitaire'",
    speed: formatVesselSpeed(8.2),
    weather: `☀️ ESE ${formatWindSpeed(15)}`,
    date: "17. července 2026",
    hash: "sha256:e3b0c4429...",
    entries: [
      {
        time: "11:00 UTC",
        category: "Kotvení",
        notes: `Kotevní manévr v zátoce Cane Garden Bay (Tortola). Hloubka ${formatDepth(5.0)}, písek. Kotevní řetěz vypuštěn 25 metrů, drží bezpečně.`,
        locked: true,
      },
      {
        time: "13:30 UTC",
        category: "Přeplavba",
        notes: `Vyplutí směr Jost Van Dyke. Rychlý zadobční vítr ${formatWindSpeed(15)}, plavba na plný genaker. Rychlost dosahuje ${formatVesselSpeed(9.0)}. Posádka v naprosté pohodě.`,
        locked: false,
      }
    ]
  },
  {
    vessel: "Sloop 'Windrunner'",
    speed: "7.1 kn",
    weather: "☁️ W 22 uzlů",
    date: "17. července 2026",
    hash: "sha256:a4f109be3...",
    entries: [
      {
        time: "07:30 UTC",
        category: "Hlídka",
        notes: "Ranní hlídka předává službu. Pozice 54°22'N, 11°05'E (Baltské moře). Teplota vody 14°C, vzduch 16°C. Viditelnost 5 NM.",
        locked: true,
      },
      {
        time: "09:00 UTC",
        category: "Plavba",
        notes: "Křižování proti větru u ostrova Fehmarn. Kurz 065°, korigováno o snos proudem. Ref 2 na hlavní plachtě. Motor připraven v pohotovosti.",
        locked: false,
      }
    ]
  }
];

export default function DashboardPage() {
  const { t, lang, changeLanguage } = useTranslation();
  
  const [stats, setStats] = useState<DashboardStats>({
    vessels: 0,
    logbooks: 0,
    entries: 0,
    activeModules: 0,
  });

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [publicLogbooks, setPublicLogbooks] = useState<any[]>([]);

  // Interactive mock UI state
  const [mockVesselName, setMockVesselName] = useState("Sailing Yacht 'Čáslav'");
  const [mockSpeed, setMockSpeed] = useState("6.8 kn");
  const [mockWeather, setMockWeather] = useState("🌤️ NW 12 uzlů");
  const [mockDate, setMockDate] = useState("17. července 2026");
  const [mockHash, setMockHash] = useState("sha256:078b2d49a...");
  const [mockEntries, setMockEntries] = useState<any[]>([]);

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

  useEffect(() => {
    if (token) return;
    publicApi.listLogbooks()
      .then(setPublicLogbooks)
      .catch(console.error);
  }, [token]);

  // Hook to load actual or random mock voyage data
  useEffect(() => {
    if (publicLogbooks.length > 0) {
      // Pick the first public logbook
      const actualLog = publicLogbooks[0];
      setMockVesselName(`Sailing Yacht '${actualLog.vessel_name}'`);
      setMockDate(actualLog.created_at ? new Date(actualLog.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' }) : "Dnes");
      setMockHash(`sha256:${actualLog.id.substring(0, 8)}...`);
      
      publicApi.listEntries(actualLog.id)
        .then((data) => {
          if (data && data.length > 0) {
            const mapped = data.slice(-2).map((e: any) => ({
              time: new Date(e.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) + " UTC",
              category: e.category || "Zápis",
              notes: e.notes || "Bez popisku.",
              locked: e.is_locked
            }));
            setMockEntries(mapped);
            if (data[data.length - 1].speed !== null) {
              setMockSpeed(`${data[data.length - 1].speed} kn`);
            }
            if (data[data.length - 1].wind_speed !== null) {
              setMockWeather(`🌤️ ${data[data.length - 1].wind_direction || 'N'} ${data[data.length - 1].wind_speed} uzlů`);
            }
          } else {
            loadRandomVoyage();
          }
        })
        .catch(() => loadRandomVoyage());
    } else {
      loadRandomVoyage();
    }

    function loadRandomVoyage() {
      const randomIndex = Math.floor(Math.random() * RANDOM_VOYAGES.length);
      const selected = RANDOM_VOYAGES[randomIndex];
      setMockVesselName(selected.vessel);
      setMockSpeed(selected.speed);
      setMockWeather(selected.weather);
      setMockDate(selected.date);
      setMockHash(selected.hash);
      setMockEntries(selected.entries);
    }
  }, [publicLogbooks]);

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
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-md p-0.5">
              <button
                onClick={() => changeLanguage('cs')}
                className={`px-2 py-1 text-[10px] font-semibold rounded transition ${
                  lang === 'cs'
                    ? 'bg-[#5e6ad2] text-white'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                CS
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 text-[10px] font-semibold rounded transition ${
                  lang === 'en'
                    ? 'bg-[#5e6ad2] text-white'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                EN
              </button>
            </div>

            <Link href="/login" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition px-3 py-1.5 rounded-md hover:bg-white/[0.04]">
              {t('common.login')}
            </Link>
            <Link href="/register" className="text-xs font-medium bg-[#5e6ad2] hover:bg-[#828fff] text-white transition px-4 py-2 rounded-md shadow-lg shadow-[#5e6ad2]/20">
              {t('common.register')}
            </Link>
          </div>
        </nav>

        {/* ── Hero Section ── */}
        <section className="pt-32 pb-16 px-6 text-center max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#7170ff] bg-[#5e6ad2]/10 border border-[#7170ff]/20 rounded-full px-3 py-1 mb-6 tracking-tight">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7170ff] animate-pulse" />
            {t('landing.tag')}
          </div>
          <h1 className="text-5xl md:text-6xl font-medium leading-[1.05] tracking-[-1.5px] mb-6 bg-gradient-to-b from-[#f7f8f8] to-[#d0d6e0] bg-clip-text text-transparent">
            {t('landing.title_1')}<br />{t('landing.title_2')}
          </h1>
          <p className="text-base md:text-lg text-[#8a8f98] leading-relaxed max-w-xl mx-auto mb-10 tracking-tight">
            {t('landing.desc')}
          </p>
          <div className="flex items-center justify-center gap-4 mb-20">
            <Link href="/login" className="px-6 py-3 bg-[#5e6ad2] hover:bg-[#828fff] text-white text-sm font-medium rounded-md transition shadow-xl shadow-[#5e6ad2]/15">
              {t('landing.enter_btn')}
            </Link>
            <Link href="/register" className="px-6 py-3 bg-white/[0.02] hover:bg-white/[0.05] text-[#f7f8f8] text-sm font-medium rounded-md border border-white/[0.08] transition">
              {t('landing.register_btn')}
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
                      <span>{mockVesselName}</span>
                      <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white/[0.01] border border-white/[0.05] rounded-lg p-3">
                    <span className="text-[10px] text-[#62666d] block font-mono-custom uppercase">Aktuální rychlost</span>
                    <span className="text-xl font-semibold text-[#f7f8f8]">{mockSpeed}</span>
                  </div>
                  <div className="bg-white/[0.01] border border-white/[0.05] rounded-lg p-3">
                    <span className="text-[10px] text-[#62666d] block font-mono-custom uppercase">Počasí na pozici</span>
                    <span className="text-xs text-[#d0d6e0] font-medium flex items-center gap-1.5 mt-0.5">
                      <span>{mockWeather}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Content (Logbook List) */}
              <div className="col-span-2 p-5 bg-[#08090a]/50 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/[0.05] pb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">Chronologický zápis deníku</h3>
                    <span className="text-[10px] font-mono-custom text-[#62666d]">{mockDate}</span>
                  </div>
                  <div className="space-y-2">
                    {mockEntries.map((entry, index) => (
                      <div
                        key={index}
                        className={`bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 ${
                          index > 0 ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-medium font-mono-custom ${
                            index === 0 ? 'text-[#7170ff]' : 'text-[#8a8f98]'
                          }`}>
                            {entry.time} · {entry.category}
                          </span>
                          {entry.locked && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#10b981]/10 text-[#10b981] rounded-full font-mono-custom">IMO Valid</span>
                          )}
                        </div>
                        <p className="text-xs text-[#d0d6e0] leading-relaxed">
                          {entry.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.05] pt-3 text-[10px] font-mono-custom text-[#62666d]">
                  <span className="truncate max-w-[200px]">Hash integrity: {mockHash}</span>
                  <span className="text-[#10b981]">● Zámek aktivní</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Active Public Logbooks Section ── */}
        {publicLogbooks.length > 0 && (
          <section className="max-w-3xl mx-auto px-6 pb-16 relative z-10 text-left">
            <h2 className="text-xs font-semibold text-[#7170ff] uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {t('landing.live_title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publicLogbooks.map((log) => (
                <Link
                  key={log.id}
                  href={`/public/logbook/${log.id}`}
                  className="bg-[#0f1011] border border-white/[0.08] hover:border-[#5e6ad2]/50 rounded-xl p-5 block transition group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400 group-hover:text-white transition">⛵ {log.vessel_name}</span>
                    <span className="px-2 py-0.5 bg-red-950/40 text-red-400 border border-red-800/30 rounded-full text-[10px] font-mono-custom">LIVE TRACKING</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-[#7170ff] transition">{log.title}</h3>
                  <div className="mt-3 pt-3 border-t border-white/[0.05] flex justify-between items-center text-[11px] text-[#8a8f98]">
                    <span>{t('landing.live_route')}: <strong>{log.voyage_from || '—'}</strong> → <strong>{log.voyage_to || '—'}</strong></span>
                    <span className="text-[#7170ff] font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">{t('landing.live_show')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Features Section ── */}
        <section className="max-w-5xl mx-auto px-6 pb-24 relative z-10">
          <div className="text-xs font-semibold text-[#62666d] uppercase tracking-wider mb-8 text-center">{t('landing.tech_title')}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1 */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 hover:bg-white/[0.03] hover:border-white/[0.1] transition group">
              <div className="w-10 h-10 rounded-lg bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#7170ff] flex items-center justify-center text-lg mb-5 group-hover:scale-105 transition">📖</div>
              <h3 className="text-sm font-semibold tracking-tight text-[#f7f8f8] mb-2">{t('landing.card_imo_title')}</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                {t('landing.card_imo_desc')}
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 hover:bg-white/[0.03] hover:border-white/[0.1] transition group">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] flex items-center justify-center text-lg mb-5 group-hover:scale-105 transition">🗺️</div>
              <h3 className="text-sm font-semibold tracking-tight text-[#f7f8f8] mb-2">{t('landing.card_map_title')}</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                {t('landing.card_map_desc')}
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 hover:bg-white/[0.03] hover:border-white/[0.1] transition group">
              <div className="w-10 h-10 rounded-lg bg-[#7170ff]/10 border border-[#7170ff]/20 text-[#7170ff] flex items-center justify-center text-lg mb-5 group-hover:scale-105 transition">🤖</div>
              <h3 className="text-sm font-semibold tracking-tight text-[#f7f8f8] mb-2">{t('landing.card_ai_title')}</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                {t('landing.card_ai_desc')}
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
          <nav className="flex items-center gap-1 flex-wrap">
            <Link href="/logbook" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">📖 Logbook</Link>
            <Link href="/vessels" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">⛵ Lodě</Link>
            <Link href="/crew" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">👥 Posádka</Link>
            <Link href="/weather" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">🌤️ Meteo</Link>
            <Link href="/anchoring" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">⚓ Kotvení</Link>
            <Link href="/cashbox" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">💰 Pokladna</Link>
            <Link href="/map" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">🗺️ Mapa</Link>
            <Link href="/settings" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">⚙️ Nastavení</Link>
            <Link href="/help" className="text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition">❓ Nápověda</Link>

            <div className="flex items-center gap-0.5 bg-white/[0.02] border border-white/[0.05] rounded-md p-0.5 ml-2">
              <button
                onClick={() => changeLanguage('cs')}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition ${
                  lang === 'cs' ? 'bg-[#5e6ad2] text-white' : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                CS
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition ${
                  lang === 'en' ? 'bg-[#5e6ad2] text-white' : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                EN
              </button>
            </div>
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
        <h3 className="text-xs font-semibold text-[#62666d] uppercase tracking-wider mb-4 font-mono-custom">Rychlé akce a moduly</h3>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction title="Lodní Deníky" description="Zprávy z plavby, autopilot a historie" href="/logbook" icon="📖" />
          <QuickAction title="Posádka & Služby" description="Členové, kormidlo a hlídky v kuchyni" href="/crew" icon="👥" />
          <QuickAction title="Meteo & Synoptika" description="Open-Meteo, předpověď a WMO barbs" href="/weather" icon="🌤️" />
          <QuickAction title="Kotvení & Alarm" description="Kotevní geofence, depth & řetěz" href="/anchoring" icon="⚓" />
          <QuickAction title="Lodní Pokladna" description="Rozpočet, proviant, palivo & poplatky" href="/cashbox" icon="💰" />
          <QuickAction title="Mapa & AIS" description="Zobrazení trasy, GPS & AIS terče" href="/map" icon="🗺️" />
          <QuickAction title="Správa Plavidel" description="Seznam lodí, rozměry a specifikace" href="/vessels" icon="🚢" />
          <QuickAction title="Nastavení Systemu" description="Moduly, Telegram bot a PWA" href="/settings" icon="⚙️" />
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
