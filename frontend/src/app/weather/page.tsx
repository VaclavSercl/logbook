'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { vesselsApi, weatherApi } from '@/lib/api';

interface WindBarbInfo {
  speed_knots: number;
  rounded_speed_knots: number;
  direction_deg: number;
  cardinal: string;
  is_calm: boolean;
  pennants: number;
  full_barbs: number;
  half_barbs: number;
  text_description: string;
  symbol: string;
  notation_code?: string;
}

interface ForecastItem {
  time: string;
  temperature: number;
  wind_speed: number;
  wind_direction: string;
  wind_direction_deg: number;
  precipitation: number;
  sea_state: string;
  wind_barb: WindBarbInfo;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: string;
  wind_direction_deg?: number;
  visibility: number;
  sea_state: string;
  clouds: number;
  location?: { lat: number; lng: number };
  wind_barb?: WindBarbInfo;
  forecast?: ForecastItem[];
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
  }, [token, mounted]);

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

  if (!mounted) return <div className="min-h-screen bg-slate-900" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🌤️</span> Meteo & Synoptická Předpověď
            </h1>
            <p className="text-sm text-slate-400">
              Přesné meteorologické údaje pro oblast plavby se synoptickým značení větru (WMO wind barbs).
            </p>
          </div>

          {vessels.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-sm text-slate-400 font-medium">Loď:</span>
              <select
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    ⛵ {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300">
            {error}
          </div>
        ) : weather ? (
          <div className="space-y-6">
            {/* Current Weather Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Wind Card with Synoptic Wind Barb */}
              <div className="md:col-span-2 bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-md border border-blue-800/50">
                      Aktuální vítr & Synoptické značení
                    </span>
                    <h2 className="text-3xl font-extrabold text-white mt-2">
                      {weather.wind_speed} <span className="text-lg font-normal text-slate-400">uzlů (kn)</span>
                    </h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Směr: <span className="font-bold text-white">{weather.wind_direction}</span> ({weather.wind_direction_deg ?? getWindRotation(weather.wind_direction)}°) — {getWindStatusText(weather.wind_speed)}
                    </p>
                  </div>

                  {/* Compass / Arrow Visual */}
                  <div className="relative w-20 h-20 bg-slate-800/80 rounded-full border border-slate-700 flex items-center justify-center shadow-inner">
                    <span className="absolute text-[10px] top-1 text-slate-400 font-bold">N</span>
                    <span className="absolute text-[10px] bottom-1 text-slate-400 font-bold">S</span>
                    <span className="absolute text-[10px] left-1 text-slate-400 font-bold">W</span>
                    <span className="absolute text-[10px] right-1 text-slate-400 font-bold">E</span>
                    <div
                      className="text-2xl transition-transform duration-500"
                      style={{ transform: `rotate(${getWindRotation(weather.wind_direction)}deg)` }}
                      title={`Vítr z ${weather.wind_direction}`}
                    >
                      ⬇️
                    </div>
                  </div>
                </div>

                {/* Synoptic Wind Barb Visual Box */}
                {weather.wind_barb && (
                  <div className="mt-4 bg-slate-950/80 border border-cyan-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-xs font-bold text-cyan-400 uppercase">Synoptické opeření (WMO Wind Barb)</div>
                      <div className="text-sm text-slate-200">{weather.wind_barb.text_description}</div>
                    </div>
                    <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                      <span className="text-2xl text-cyan-300 font-mono tracking-widest">{weather.wind_barb.symbol}</span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded">{weather.wind_barb.notation_code}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Conditions Card */}
              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Stav moře & Atmosféra
                  </span>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800 text-sm">
                      <span className="text-slate-400">Stav moře (Douglas):</span>
                      <span className="font-semibold text-white">{weather.sea_state}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800 text-sm">
                      <span className="text-slate-400">Teplota vzduchu:</span>
                      <span className="font-semibold text-white">{weather.temperature} °C</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800 text-sm">
                      <span className="text-slate-400">Tlak vzduchu:</span>
                      <span className="font-semibold text-white">{weather.pressure} hPa</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800 text-sm">
                      <span className="text-slate-400">Vlhkost:</span>
                      <span className="font-semibold text-white">{weather.humidity}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800 text-sm">
                      <span className="text-slate-400">Oblačnost:</span>
                      <span className="font-semibold text-white">{weather.clouds}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 text-sm">
                      <span className="text-slate-400">Viditelnost:</span>
                      <span className="font-semibold text-white">{weather.visibility} NM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Forecast Timeline (24 Hours) */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📈</span> Předpověď pro oblast na 24 hodin
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {weather.forecast.map((item, idx) => {
                    const timeStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div
                        key={idx}
                        className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-center flex flex-col items-center justify-between space-y-2 hover:border-blue-500/50 transition-all"
                      >
                        <span className="text-xs font-semibold text-slate-400">{timeStr}</span>
                        <span className="text-xl font-extrabold text-blue-400">{item.wind_speed} <span className="text-[10px] font-normal text-slate-400">kn</span></span>
                        <div className="text-lg font-mono text-cyan-300" title={item.wind_barb?.text_description}>
                          {item.wind_barb?.symbol || '○'}
                        </div>
                        <span className="text-[11px] text-slate-300 font-medium">{item.wind_direction}</span>
                        <span className="text-xs text-slate-400">{item.temperature}°C</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
