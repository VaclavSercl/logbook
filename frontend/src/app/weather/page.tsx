'use client';

import { useEffect, useState } from 'react';
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // 1. Fetch vessels list
  useEffect(() => {
    if (!token) return;
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
    if (!token || !selectedVesselId) return;
    setLoading(true);
    setError(null);
    weatherApi.get(selectedVesselId, token)
      .then((data) => {
        setWeather(data as WeatherData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch weather:', err);
        setError('Nepodařilo se získat data o počasí.');
        setLoading(false);
      });
  }, [selectedVesselId, token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení počasí se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">🌤️ Počasí</h1>
        
        {/* Vessel Selector */}
        {vessels.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Aktuální loď:</span>
            <select
              value={selectedVesselId}
              onChange={(e) => setSelectedVesselId(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4 text-sm">Načítám meteorologická data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700 max-w-lg mx-auto">
            <p className="text-red-400 text-lg">⚠️ {error}</p>
            <p className="text-slate-500 text-sm mt-2">
              Ujistěte se, že máte přidanou loď a GPS body.
            </p>
          </div>
        ) : !weather ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-lg">Žádná data o počasí</p>
            <p className="text-slate-500 text-sm mt-2">
              Chybí GPS pozice lodi pro určení polohy.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Live Weather Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <WeatherCard icon="🌡️" label="Teplota vzduchu" value={`${weather.temperature.toFixed(1)} °C`} />
              <WeatherCard icon="💧" label="Vlhkost vzduchu" value={`${weather.humidity} %`} />
              <WeatherCard icon="📊" label="Atmosférický tlak" value={`${weather.pressure.toFixed(0)} hPa`} />
              <WeatherCard icon="💨" label="Rychlost & směr větru" value={`${weather.wind_speed.toFixed(1)} kn (${weather.wind_direction})`} />
              <WeatherCard icon="👁️" label="Viditelnost" value={`${weather.visibility} km`} />
              <WeatherCard icon="🌊" label="Stav moře (Douglas)" value={weather.sea_state} />
              <WeatherCard icon="☁️" label="Oblačnost" value={`${weather.clouds} %`} />
            </div>

            {/* Weather forecast disclaimer */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <h2 className="text-lg font-medium text-slate-100 mb-2">Předpovědní modely (Open-Meteo)</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tato meteorologická data a odhady stavu moře jsou získávány na základě aktuálních souřadnic vaší lodi z celosvětových numerických modelů předpovědi počasí (NEMS/ECMWF). Pro plnou offline podporu na moři doporučujeme v nastavení aktivovat integraci satelitního přijímače Iridium GO! nebo lokálního AI modelu.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function WeatherCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700/60 shadow-lg flex items-center gap-4 hover:border-slate-600 transition duration-200">
      <span className="text-3xl p-3 bg-slate-700/40 rounded-lg">{icon}</span>
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-slate-100 font-semibold text-lg mt-0.5">{value}</p>
      </div>
    </div>
  );
}
