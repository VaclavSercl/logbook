'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { entriesApi, gpsApi } from '@/lib/api';

function NewLogbookEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const queryLogbookId = searchParams.get('logbook_id');
  const queryVesselId = searchParams.get('vessel_id');

  const [logbookId, setLogbookId] = useState('');
  const [vesselId, setVesselId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [timestamp, setTimestamp] = useState('');
  const [category, setCategory] = useState('navigation');
  const [notes, setNotes] = useState('');
  
  // Navigation Info
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [course, setCourse] = useState('');
  const [speed, setSpeed] = useState('');

  // Weather & Environment Info
  const [windDirection, setWindDirection] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [pressure, setPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [visibility, setVisibility] = useState('');
  const [seaState, setSeaState] = useState('');

  // Vessel Systems Info
  const [engineHours, setEngineHours] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [batteryLevel, setBatteryLevel] = useState('');

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

  // Resolve logbook and vessel IDs from query parameters or localStorage
  useEffect(() => {
    if (!mounted) return;
    // Current local time string in YYYY-MM-DDTHH:MM format
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    setTimestamp(localNow.toISOString().slice(0, 16));

    if (queryLogbookId) {
      setLogbookId(queryLogbookId);
    } else if (typeof window !== 'undefined') {
      const savedLogbookId = localStorage.getItem('selectedLogbookId');
      if (savedLogbookId) setLogbookId(savedLogbookId);
    }

    if (queryVesselId) {
      setVesselId(queryVesselId);
    } else if (typeof window !== 'undefined') {
      const savedVesselId = localStorage.getItem('selectedVesselId');
      if (savedVesselId) setVesselId(savedVesselId);
    }
  }, [queryLogbookId, queryVesselId]);

  // Load latest GPS point to pre-populate navigation fields
  async function handleLoadLatestGps() {
    if (!token || !vesselId) {
      setError('Nelze načíst GPS pozici: Chybí identifikátor plavidla.');
      return;
    }

    try {
      setGpsLoading(true);
      setError('');
      const latestGps = await gpsApi.getLatest(vesselId, token);
      
      if (latestGps) {
        setLatitude(latestGps.latitude.toString());
        setLongitude(latestGps.longitude.toString());
        if (latestGps.course !== null && latestGps.course !== undefined) {
          setCourse(latestGps.course.toString());
        }
        if (latestGps.speed !== null && latestGps.speed !== undefined) {
          setSpeed(latestGps.speed.toString());
        }
      } else {
        setError('Pro toto plavidlo nebyly nalezeny žádné GPS body.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chyba při stahování nejnovější GPS pozice';
      setError(msg);
    } finally {
      setGpsLoading(false);
    }
  }

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!logbookId) {
      setError('Chyba: Nebyl vybrán žádný lodní deník. Vraťte se prosím zpět.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const parsedTimestamp = new Date(timestamp).toISOString();

      const payload: Record<string, unknown> = {
        logbook_id: logbookId,
        timestamp: parsedTimestamp,
        category,
        notes: notes.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        course: course ? parseFloat(course) : undefined,
        speed: speed ? parseFloat(speed) : undefined,
        wind_direction: windDirection ? parseFloat(windDirection) : undefined,
        wind_speed: windSpeed ? parseFloat(windSpeed) : undefined,
        pressure: pressure ? parseFloat(pressure) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        visibility: visibility ? parseFloat(visibility) : undefined,
        sea_state: seaState.trim() || undefined,
        engine_hours: engineHours ? parseFloat(engineHours) : undefined,
        fuel_level: fuelLevel ? parseFloat(fuelLevel) : undefined,
        battery_level: batteryLevel ? parseFloat(batteryLevel) : undefined,
      };

      // If offline, save to queue immediately
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const queue = JSON.parse(localStorage.getItem('offline_log_entries') || '[]');
        queue.push({ logbookId, payload, token });
        localStorage.setItem('offline_log_entries', JSON.stringify(queue));
        
        setSuccess(true);
        setError('Uloženo offline. Zápis se automaticky odešle, jakmile získáte signál.');
        setTimeout(() => {
          router.push('/logbook');
        }, 3000);
        return;
      }

      try {
        await entriesApi.create(logbookId, payload, token);
        setSuccess(true);
        
        setTimeout(() => {
          router.push('/logbook');
        }, 1000);
      } catch (err: unknown) {
        // Fallback for network error
        const queue = JSON.parse(localStorage.getItem('offline_log_entries') || '[]');
        queue.push({ logbookId, payload, token });
        localStorage.setItem('offline_log_entries', JSON.stringify(queue));
        
        setSuccess(true);
        setError('Detekován výpadek spojení. Uloženo offline pro budoucí synchronizaci.');
        setTimeout(() => {
          router.push('/logbook');
        }, 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chyba při zápisu do deníku';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="text-center p-6 bg-slate-800 rounded-lg border border-slate-700 max-w-sm">
          <p className="text-lg font-medium mb-4">Pro zápis do deníku se musíte přihlásit.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Přihlásit se
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col justify-start">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm font-medium transition flex items-center gap-1.5">
              🏠 Domů
            </Link>
            <Link href="/logbook" className="text-slate-400 hover:text-slate-100 transition">
              ← Zpět do deníku
            </Link>
          </div>
          <h1 className="text-xl font-bold">✍️ Nový záznam plavby</h1>
        </div>

        {error && (
          <div className="p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-900/40 border border-green-700 rounded-lg text-green-200">
            Zápis byl úspěšně vytvořen! Přesměrovávám...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Log Information */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">1. Základní údaje</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 font-medium mb-1">Čas a datum</label>
                <input
                  type="datetime-local"
                  required
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 font-medium mb-1">Kategorie zápisu</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="navigation">Navigace / Poloha (Navigation)</option>
                  <option value="weather">Počasí (Weather)</option>
                  <option value="engine">Strojovna / Motor (Engine)</option>
                  <option value="crew">Posádka (Crew)</option>
                  <option value="safety">Bezpečnost (Safety)</option>
                  <option value="port">Přístav / Kotvení (Port)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 font-medium mb-1">Poznámky / Hlášení</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Popište průběh plavby, události, plachty, manévry..."
                rows={4}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
              ></textarea>
            </div>
          </div>

          {/* Section 2: Navigation (Coordinates, Course, Speed) */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">2. Navigace</h2>
              {vesselId && (
                <button
                  type="button"
                  onClick={handleLoadLatestGps}
                  disabled={gpsLoading}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                >
                  {gpsLoading ? 'Načítání GPS...' : '🛰️ Načíst nejnovější GPS pozici'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Zeměpisná šířka (Lat)</label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Např. 43.5081"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Zeměpisná délka (Lon)</label>
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Např. 16.4402"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Kurs (° COG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="360"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Např. 185"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Rychlost (SOG kn)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  placeholder="Např. 6.2"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Weather & Conditions (Wind, Pressure, Temp, Sea) */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">3. Počasí a meteorologie</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Směr větru (°)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="360"
                  value={windDirection}
                  onChange={(e) => setWindDirection(e.target.value)}
                  placeholder="Např. 45"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Rychlost větru (kn)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(e.target.value)}
                  placeholder="Např. 15.4"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Tlak vzduchu (hPa)</label>
                <input
                  type="number"
                  step="0.1"
                  min="800"
                  max="1100"
                  value={pressure}
                  onChange={(e) => setPressure(e.target.value)}
                  placeholder="Např. 1013"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Teplota vzduchu (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="Např. 24.5"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Viditelnost (NM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  placeholder="Např. 10.0"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Stav moře (Sea State)</label>
                <input
                  type="text"
                  value={seaState}
                  onChange={(e) => setSeaState(e.target.value)}
                  placeholder="Např. Mírné vlny (Douglas 2)"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Vessel Systems Status */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">4. Lodní systémy a stav</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Motohodiny (mth)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={engineHours}
                  onChange={(e) => setEngineHours(e.target.value)}
                  placeholder="Např. 1240.5"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Palivo (%)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  placeholder="Např. 85"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Napětí baterie (V / %)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={batteryLevel}
                  onChange={(e) => setBatteryLevel(e.target.value)}
                  placeholder="Např. 12.8"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end items-center gap-4">
            <Link
              href="/logbook"
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition text-sm"
            >
              Zrušit
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-bold transition text-sm"
            >
              {loading ? 'Ukládám...' : 'Uložit zápis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewLogbookEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Načítám formulář...</p>
      </div>
    }>
      <NewLogbookEntryForm />
    </Suspense>
  );
}
