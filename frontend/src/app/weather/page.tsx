'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { vesselsApi, weatherApi } from '@/lib/api';

interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: string;
  visibility: number;
  sea_state: string;
  clouds: number;
}

interface Vessel {
  id: string;
  name: string;
}

export default function WeatherPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

  // 1. Fetch vessels list
  useEffect(() => {
    if (!mounted || !token) return;
    vesselsApi.list(token)
      .then((data: any) => {
        const list = data as Vessel[];
        setVessels(list);
        if (list.length > 0) {
          setSelectedVesselId(list[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load vessels:', err);
        setError('Nepodařilo se načíst lodě.');
        setLoading(false);
      });
  }, [token]);

  // 2. Fetch weather for selected vessel
  useEffect(() => {
    if (!mounted || !token || !selectedVesselId) return;
    setLoading(true);
    setError(null);
    weatherApi.get(selectedVesselId, token)
      .then((data: any) => {
        setWeather(data as WeatherData);
      })
      .catch((err) => {
        console.error('Failed to load weather:', err);
        setError('Nepodařilo se stáhnout data o počasí.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedVesselId, mounted, token]);

  const getWindRotation = (dir: string) => {
    const compassMap: Record<string, number> = {
      N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
      E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
      S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
      W: 270, WNW: 292.5, NW: 315, NNW: 337.5
    };
    if (dir in compassMap) return compassMap[dir];
    const parsed = parseFloat(dir);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getWindStatusText = (speed: number) => {
    if (speed < 4) return 'Bezvětří / Slabý vánek';
    if (speed < 10) return 'Mírný vítr';
    if (speed < 17) return 'Dobrý jachtařský vítr';
    if (speed < 22) return 'Svěží vítr (Reff 1)';
    if (speed < 28) return 'Silný vítr (Reff 2)';
    return 'Bouřlivý vítr / Výchřice (⚠️ Bezpečné kotvení!)';
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení počasí se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/[0.03] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/[0.03] blur-[150px] pointer-events-none" />

      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 rounded-lg text-xs font-semibold tracking-tight transition flex items-center gap-1.5 shadow-lg shadow-black/20">
            🏠 Domů
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">🌤️ Meteostanice Cockpit</h1>
        </div>
        
        {/* Vessel Selector */}
        {vessels.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Plavidlo:</span>
            <select
              value={selectedVesselId}
              onChange={(e) => setSelectedVesselId(e.target.value)}
              className="bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  🚢 {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main className="p-6 max-w-5xl mx-auto relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4 text-xs font-medium uppercase tracking-wider">Načítám meteorologická data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-red-950/30 max-w-lg mx-auto shadow-2xl">
            <span className="text-4xl">⚠️</span>
            <p className="text-red-400 text-lg font-semibold mt-4">Nebylo možné načíst počasí</p>
            <p className="text-slate-500 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
              {error} Ujistěte se, že plavidlo má zaznamenané GPS body pro lokalizaci předpovědi.
            </p>
          </div>
        ) : !weather ? (
          <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-slate-800/80 max-w-lg mx-auto shadow-2xl">
            <span className="text-4xl">📍</span>
            <p className="text-slate-400 text-lg font-semibold mt-4">Chybí GPS pozice</p>
            <p className="text-slate-500 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
              Zatím nebyl zaznamenán žádný GPS bod. Pro určení počasí v místě plavby uložte souřadnice lodi.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Weather Cockpit Main Panel */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.02] rounded-full blur-[80px] pointer-events-none" />
              
              <div className="space-y-3 relative z-10 text-center md:text-left">
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] uppercase font-bold tracking-wider rounded-full">
                  Aktuální stav na pozici
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  {weather.temperature.toFixed(1)} °C
                </h2>
                <p className="text-sm font-semibold text-slate-300">
                  {getWindStatusText(weather.wind_speed)}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                  Doporučené plachty: <span className="text-slate-400 font-medium">Plné prádlo / Standardní ref.</span> Stav moře podle Douglase je hodnocen jako <span className="text-slate-400 font-medium">{weather.sea_state}</span>.
                </p>
              </div>

              {/* Wind Dial Visual Instrument */}
              <div className="flex flex-col items-center justify-center bg-slate-950/40 border border-slate-800/85 p-6 rounded-2xl shadow-xl w-full max-w-[240px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4">Lodní Anemometr</span>
                <div className="w-32 h-32 rounded-full border border-slate-800/80 flex items-center justify-center relative bg-slate-900/60">
                  {/* Cardinal direction labels */}
                  <span className="absolute top-1 text-[9px] font-bold text-slate-600">N</span>
                  <span className="absolute right-1.5 text-[9px] font-bold text-slate-600">E</span>
                  <span className="absolute bottom-1 text-[9px] font-bold text-slate-600">S</span>
                  <span className="absolute left-1.5 text-[9px] font-bold text-slate-600">W</span>
                  
                  {/* Rotating pointer */}
                  <div 
                    className="w-full h-full absolute transition duration-500 ease-out" 
                    style={{ transform: `rotate(${getWindRotation(weather.wind_direction)}deg)` }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <polygon points="50,15 46,35 54,35" fill="#3b82f6" />
                      <line x1="50" y1="35" x2="50" y2="85" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,2" />
                    </svg>
                  </div>
                  
                  <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center z-10">
                    <span className="text-xs font-bold text-white">{weather.wind_speed.toFixed(0)}</span>
                    <span className="text-[7px] text-slate-500 uppercase font-bold">kn</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-300 mt-4">Směr: {weather.wind_direction} ({getWindRotation(weather.wind_direction)}°)</span>
              </div>
            </div>

            {/* Weather Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <PremiumWeatherCard 
                icon="🌡️" 
                label="Teplota vzduchu" 
                value={`${weather.temperature.toFixed(1)} °C`} 
                subtext="Pocitová i reálná teplota"
                theme="orange"
              />
              <PremiumWeatherCard 
                icon="💨" 
                label="Rychlost & směr větru" 
                value={`${weather.wind_speed.toFixed(1)} kn`} 
                subtext={`Směr: ${weather.wind_direction}`}
                theme="teal"
              />
              <PremiumWeatherCard 
                icon="📊" 
                label="Atmosférický tlak" 
                value={`${weather.pressure.toFixed(0)} hPa`} 
                subtext="Stabilní vývoj tlaku"
                theme="purple"
              />
              <PremiumWeatherCard 
                icon="🌊" 
                label="Stav moře (Douglas)" 
                value={weather.sea_state} 
                subtext="Výška a intenzita vln"
                theme="blue"
              />
              <PremiumWeatherCard 
                icon="💧" 
                label="Vlhkost vzduchu" 
                value={`${weather.humidity} %`} 
                subtext="Rosný bod a relativní vlhkost"
                theme="indigo"
              />
              <PremiumWeatherCard 
                icon="☁️" 
                label="Oblačnost & Krytí" 
                value={`${weather.clouds} %`} 
                subtext="Oblačnost celkem"
                theme="slate"
              />
            </div>

            {/* Description Disclaimer */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">📡 Informace o předpovědi</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Data jsou stahována v reálném čase z numerických modelů Open-Meteo podle poslední známé GPS pozice vašeho plavidla. V případě plavby v oblastech bez mobilního signálu se data ukládají do mezipaměti nebo se synchronizují přes satelitní kanály Iridium GO! / Starlink.
              </p>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

function PremiumWeatherCard({ icon, label, value, subtext, theme }: { icon: string; label: string; value: string; subtext: string; theme: string }) {
  const themeMap: Record<string, string> = {
    orange: 'border-orange-500/10 hover:border-orange-500/30 bg-gradient-to-b from-slate-900 to-orange-950/[0.04]',
    teal: 'border-teal-500/10 hover:border-teal-500/30 bg-gradient-to-b from-slate-900 to-teal-950/[0.04]',
    purple: 'border-purple-500/10 hover:border-purple-500/30 bg-gradient-to-b from-slate-900 to-purple-950/[0.04]',
    blue: 'border-blue-500/10 hover:border-blue-500/30 bg-gradient-to-b from-slate-900 to-blue-950/[0.04]',
    indigo: 'border-indigo-500/10 hover:border-indigo-500/30 bg-gradient-to-b from-slate-900 to-indigo-950/[0.04]',
    slate: 'border-slate-800 hover:border-slate-700 bg-slate-900'
  };

  return (
    <div className={`rounded-xl p-5 border shadow-xl flex items-center gap-4 transition duration-300 ${themeMap[theme] || 'bg-slate-900 border-slate-800'}`}>
      <span className="text-2xl p-2.5 bg-slate-950/60 rounded-xl border border-white/[0.03] shadow-inner">{icon}</span>
      <div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-slate-100 font-bold text-base mt-0.5 tracking-tight">{value}</p>
        <p className="text-[10px] text-slate-500 mt-1">{subtext}</p>
      </div>
    </div>
  );
}
