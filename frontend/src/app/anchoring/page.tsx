'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { vesselsApi, anchoringApi, gpsApi } from '@/lib/api';
import { formatDepth } from '@/lib/units';

interface Vessel {
  id: string;
  name: string;
}

interface AnchorData {
  id: string;
  vessel_id: string;
  status: string;
  latitude: number;
  longitude: number;
  depth?: number;
  chain_length?: number;
  alarm_radius?: number;
  notes?: string;
  dropped_at: string;
}

interface AnchorStatusResponse {
  is_anchored: boolean;
  anchor?: AnchorData;
  latest_gps?: { lat: number; lng: number };
  current_distance_meters: number;
  alarm_triggered: boolean;
}

export default function AnchoringPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [status, setStatus] = useState<AnchorStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Drop Anchor Form
  const [lat, setLat] = useState<string>('43.5081');
  const [lng, setLng] = useState<string>('16.4402');
  const [depth, setDepth] = useState<string>('6');
  const [chainLength, setChainLength] = useState<string>('30');
  const [alarmRadius, setAlarmRadius] = useState<string>('35');
  const [notes, setNotes] = useState<string>('Kotvení v bezpečné zátoce, písečné dno');
  const [submitting, setSubmitting] = useState(false);

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

  const fetchAnchorStatus = async (vesselId: string) => {
    if (!token || !vesselId) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await anchoringApi.getStatus(vesselId, token);
      setStatus(data as AnchorStatusResponse);

      // Auto-fill GPS from latest position if available
      if (data.latest_gps) {
        setLat(data.latest_gps.lat.toString());
        setLng(data.latest_gps.lng.toString());
      }
    } catch (err) {
      console.error('Failed to fetch anchor status:', err);
      setError('Nepodařilo se načíst stav kotvení.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVesselId) {
      fetchAnchorStatus(selectedVesselId);
      // Auto refresh anchor status every 10 seconds
      const interval = setInterval(() => fetchAnchorStatus(selectedVesselId), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedVesselId, mounted, token]);

  const handleDropAnchor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVesselId) return;
    setSubmitting(true);
    try {
      await anchoringApi.dropAnchor({
        vessel_id: selectedVesselId,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        depth: depth ? parseFloat(depth) : undefined,
        chain_length: chainLength ? parseFloat(chainLength) : undefined,
        alarm_radius: alarmRadius ? parseFloat(alarmRadius) : 30.0,
        notes,
      }, token);
      await fetchAnchorStatus(selectedVesselId);
    } catch (err) {
      alert('Chyba při spouštění kotvy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRaiseAnchor = async () => {
    if (!token || !status?.anchor || !confirm('Opravdu vytáhnout kotvu a ukončit kotevní hlídku?')) return;
    try {
      await anchoringApi.raiseAnchor(status.anchor.id, token);
      await fetchAnchorStatus(selectedVesselId);
    } catch (err) {
      alert('Chyba při vytahování kotvy.');
    }
  };

  if (!mounted) return <div className="min-h-screen bg-slate-900" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>⚓</span> Kotvení & Kotevní Alarm
            </h1>
            <p className="text-sm text-slate-400">
              Sledování polohy kotvy, hloubky, vypuštěného řetězu a aktivní geofence alarm proti driftu lodi.
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

        {loading && !status ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Status Card */}
            <div className="lg:col-span-2 space-y-6">
              {status?.alarm_triggered && (
                <div className="p-4 bg-red-950 border-2 border-red-600 text-red-200 rounded-2xl animate-pulse shadow-2xl flex items-center gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <h3 className="font-extrabold text-lg">POPLACH: LOĎ DRIFTUJE (KOTVA NEDRŽÍ)!</h3>
                    <p className="text-sm">
                      Vzdálenost od kotvy: <span className="font-bold">{status.current_distance_meters} m</span> (Max. radius: {status.anchor?.alarm_radius} m). Okamžitě zkontrolujte kotevní stání!
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Stav Kotevního Stání
                  </span>
                  {status?.is_anchored ? (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-950 text-cyan-400 border border-cyan-700/60 animate-pulse">
                      ⚓ NA KOTVĚ
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                      ⛵ NA CESTĚ / BEZ KOTVY
                    </span>
                  )}
                </div>

                {status?.is_anchored && status.anchor ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Hloubka</span>
                        <div className="text-xl font-extrabold text-white mt-1">{status.anchor.depth ? formatDepth(status.anchor.depth) : '—'}</div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Řetěz</span>
                        <div className="text-2xl font-extrabold text-cyan-400 mt-1">{status.anchor.chain_length ?? '—'} <span className="text-sm font-normal text-slate-400">m</span></div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Poměr (Scope)</span>
                        <div className="text-2xl font-extrabold text-yellow-400 mt-1">
                          {status.anchor.chain_length && status.anchor.depth ? `${(status.anchor.chain_length / status.anchor.depth).toFixed(1)}:1` : '—'}
                        </div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Odchylka</span>
                        <div className={`text-2xl font-extrabold mt-1 ${status.alarm_triggered ? 'text-red-500' : 'text-emerald-400'}`}>
                          {status.current_distance_meters} <span className="text-sm font-normal text-slate-400">m</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Pozice vypuštění kotvy:</span>
                        <span className="font-mono text-white">{status.anchor.latitude.toFixed(5)}°N, {status.anchor.longitude.toFixed(5)}°E</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Čas spuštění:</span>
                        <span className="text-white">{new Date(status.anchor.dropped_at).toLocaleString()}</span>
                      </div>
                      {status.anchor.notes && (
                        <div className="text-xs text-slate-300 pt-2 border-t border-slate-800">
                          <span className="text-slate-400 font-medium">Poznámka: </span>
                          {status.anchor.notes}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleRaiseAnchor}
                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <span>⚓</span> Vytáhnout Kotvu (Ukončit Kotvení)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <span className="text-5xl">⚓</span>
                    <h3 className="text-lg font-bold text-white">Kotva není spuštěna</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                      Loď pluje nebo je v přístavu. Pro aktivaci geofence kotevního alarmu vyplňte formulář vpravo a vyhoďte kotvu.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Drop Anchor Form */}
            <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span> Spustit Kotvu & Nastavit Alarm
              </h3>

              <form onSubmit={handleDropAnchor} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Zeměp. Šířka (Lat)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Zeměp. Délka (Lng)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hloubka (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={depth}
                      onChange={(e) => setDepth(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Délka Řetězu (m)</label>
                    <input
                      type="number"
                      step="1"
                      value={chainLength}
                      onChange={(e) => setChainLength(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Radius Alarmu (m)</label>
                  <input
                    type="number"
                    step="1"
                    value={alarmRadius}
                    onChange={(e) => setAlarmRadius(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                  />
                  <span className="text-[11px] text-slate-500">Při překročení tohoto okruhu od kotvy zazní poplach.</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Poznámky ke kotvení</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>⚓</span> Spustit Kotvu & Aktivovat Alarm
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
