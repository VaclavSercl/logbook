'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GpsPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  course: number | null;
  timestamp: string;
}

export default function MapPage() {
  const [track, setTrack] = useState<GpsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    // TODO: fetch GPS track from API
    setLoading(false);
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení mapy se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">🗺️ Mapa</h1>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm">
              OpenSeaMap
            </button>
            <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm">
              Satellite
            </button>
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
              + Přidat bod
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Map area */}
        <div className="flex-1 relative bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Načítám mapu...</p>
            </div>
          ) : track.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-slate-400 text-lg">Žádné GPS body</p>
                <p className="text-slate-500 text-sm mt-2">
                  Přidejte první bod nebo importujte GPX soubor
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">
                MapLibre mapa s trasou ({track.length} bodů)
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
          <h2 className="text-slate-100 font-medium mb-4">Trasa</h2>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-700 rounded p-3">
              <p className="text-slate-400 text-xs">Vzdálenost</p>
              <p className="text-slate-100 font-bold">0 NM</p>
            </div>
            <div className="bg-slate-700 rounded p-3">
              <p className="text-slate-400 text-xs">Prům. rychlost</p>
              <p className="text-slate-100 font-bold">0 kn</p>
            </div>
            <div className="bg-slate-700 rounded p-3">
              <p className="text-slate-400 text-xs">Max. rychlost</p>
              <p className="text-slate-100 font-bold">0 kn</p>
            </div>
            <div className="bg-slate-700 rounded p-3">
              <p className="text-slate-400 text-xs">Body</p>
              <p className="text-slate-100 font-bold">{track.length}</p>
            </div>
          </div>

          {/* Track points */}
          <h3 className="text-slate-300 text-sm font-medium mb-2">Body trasy</h3>
          <div className="space-y-2">
            {track.length === 0 ? (
              <p className="text-slate-500 text-sm">Žádné body</p>
            ) : (
              track.map((point, i) => (
                <div key={i} className="bg-slate-700 rounded p-2 text-sm">
                  <p className="text-slate-300">
                    {point.latitude.toFixed(4)}°N, {point.longitude.toFixed(4)}°E
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(point.timestamp).toLocaleString('cs-CZ')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
