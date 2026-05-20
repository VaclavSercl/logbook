'use client';

import { useEffect, useState } from 'react';

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

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    // TODO: fetch weather from API
    setLoading(false);
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení počasí se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-100">🌤️ Počasí</h1>
      </header>

      <main className="p-6">
        {loading ? (
          <p className="text-slate-400">Načítám počasí...</p>
        ) : !weather ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Žádná data o počasí</p>
            <p className="text-slate-500 text-sm mt-2">
              Přidejte GPS pozici pro získání počasí
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <WeatherCard icon="🌡️" label="Teplota" value={`${weather.temperature}°C`} />
            <WeatherCard icon="💧" label="Vlhkost" value={`${weather.humidity}%`} />
            <WeatherCard icon="📊" label="Tlak" value={`${weather.pressure} hPa`} />
            <WeatherCard icon="💨" label="Vítr" value={`${weather.wind_speed} kn ${weather.wind_direction}`} />
            <WeatherCard icon="👁️" label="Viditelnost" value={`${weather.visibility} km`} />
            <WeatherCard icon="🌊" label="Stav moře" value={weather.sea_state} />
            <WeatherCard icon="☁️" label="Oblačnost" value={`${weather.clouds}%`} />
          </div>
        )}

        {/* Forecast placeholder */}
        <div className="mt-8">
          <h2 className="text-slate-100 font-medium mb-4">Předpověď (24h)</h2>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-center">
              Předpověď počasí bude dostupná po připojení k OpenWeather API
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function WeatherCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-slate-100 font-bold text-lg">{value}</p>
        </div>
      </div>
    </div>
  );
}
