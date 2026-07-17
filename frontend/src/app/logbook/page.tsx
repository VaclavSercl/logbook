'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { vesselsApi, logbooksApi, entriesApi } from '@/lib/api';

interface Vessel {
  id: string;
  name: string;
  vessel_type?: string;
}

interface Logbook {
  id: string;
  title: string;
  vessel_id: string;
  status: string;
}

interface LogbookEntry {
  id: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  course: number | null;
  speed: number | null;
  notes: string | null;
  ai_comment: string | null;
  category: string;
  is_locked: boolean;
}

export default function LogbookPage({ searchParams }: { searchParams?: { showForm?: string } }) {
  const router = useRouter();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [logbooks, setLogbooks] = useState<Logbook[]>([]);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [selectedLogbookId, setSelectedLogbookId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals / Quick forms
  const [showVesselForm, setShowVesselForm] = useState(false);
  const [vesselName, setVesselName] = useState('');
  const [vesselType, setVesselType] = useState('Sailing Yacht');
  const [vesselLoading, setVesselLoading] = useState(false);

  const [showLogbookForm, setShowLogbookForm] = useState(false);
  const [logbookTitle, setLogbookTitle] = useState('');
  const [voyageFrom, setVoyageFrom] = useState('');
  const [voyageTo, setVoyageTo] = useState('');
  const [logbookLoading, setLogbookLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    if (searchParams?.showForm === 'true') {
      setShowLogbookForm(true);
    }
  }, [searchParams]);

  // 1. Initial Load: Fetch Vessels
  useEffect(() => {
    if (!mounted || !token) {
      if (mounted) setLoading(false);
      return;
    }
    
    async function loadInitialData() {
      try {
        setLoading(true);
        const vesselsList = await vesselsApi.list(token!);
        setVessels(vesselsList);
        
        if (vesselsList.length > 0) {
          // Check localStorage for previously selected vessel
          const savedVesselId = localStorage.getItem('selectedVesselId');
          const activeVessel = vesselsList.find((v: Vessel) => v.id === savedVesselId) || vesselsList[0];
          setSelectedVesselId(activeVessel.id);
          localStorage.setItem('selectedVesselId', activeVessel.id);
        } else {
          setLoading(false);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Chyba při načítání plavidel';
        setError(msg);
        setLoading(false);
      }
    }
    
    loadInitialData();
  }, [token]);

  // 2. Load Logbooks when selected vessel changes
  useEffect(() => {
    if (!token || !selectedVesselId) {
      setLogbooks([]);
      setSelectedLogbookId('');
      setEntries([]);
      return;
    }

    async function loadLogbooks() {
      try {
        setLoading(true);
        setError('');
        const logbooksList = await logbooksApi.list(token!, selectedVesselId);
        setLogbooks(logbooksList);

        if (logbooksList.length > 0) {
          // Check localStorage for previously selected logbook
          const savedLogbookId = localStorage.getItem('selectedLogbookId');
          const activeLogbook = logbooksList.find((l: Logbook) => l.id === savedLogbookId) || logbooksList[0];
          setSelectedLogbookId(activeLogbook.id);
          localStorage.setItem('selectedLogbookId', activeLogbook.id);
        } else {
          setSelectedLogbookId('');
          setEntries([]);
          setLoading(false);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Chyba při načítání deníků';
        setError(msg);
        setLoading(false);
      }
    }

    loadLogbooks();
  }, [token, selectedVesselId]);

  // 3. Load Entries when selected logbook changes
  useEffect(() => {
    if (!token || !selectedLogbookId) {
      setEntries([]);
      return;
    }

    async function loadEntries() {
      try {
        setLoading(true);
        setError('');
        const entriesList = await entriesApi.list(selectedLogbookId, token!);
        setEntries(entriesList);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Chyba při načítání záznamů';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadEntries();
  }, [token, selectedLogbookId]);

  // Handle vessel creation
  async function handleCreateVessel(e: React.FormEvent) {
    e.preventDefault();
    if (!vesselName.trim() || !token) return;
    
    try {
      setVesselLoading(true);
      setError('');
      const newVessel = await vesselsApi.create({
        name: vesselName,
        vessel_type: vesselType,
      }, token);
      
      setVessels((prev) => [...prev, newVessel]);
      setSelectedVesselId(newVessel.id);
      localStorage.setItem('selectedVesselId', newVessel.id);
      
      setVesselName('');
      setShowVesselForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chyba při vytváření plavidla';
      setError(msg);
    } finally {
      setVesselLoading(false);
    }
  }

  // Handle logbook creation
  async function handleCreateLogbook(e: React.FormEvent) {
    e.preventDefault();
    if (!logbookTitle.trim() || !token) return;

    if (!selectedVesselId) {
      alert('⚠️ Nelze vytvořit lodní deník bez vybraného plavidla. Nejprve prosím vytvořte loď.');
      return;
    }

    try {
      setLogbookLoading(true);
      setError('');
      const newLogbook = await logbooksApi.create({
        vessel_id: selectedVesselId,
        title: logbookTitle,
        voyage_from: voyageFrom || undefined,
        voyage_to: voyageTo || undefined,
      }, token);

      setLogbooks((prev) => [...prev, newLogbook]);
      setSelectedLogbookId(newLogbook.id);
      localStorage.setItem('selectedLogbookId', newLogbook.id);

      setLogbookTitle('');
      setVoyageFrom('');
      setVoyageTo('');
      setShowLogbookForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chyba při vytváření deníku';
      setError(msg);
    } finally {
      setLogbookLoading(false);
    }
  }

  // Handle entry delete
  async function handleDeleteEntry(entryId: string) {
    if (!token || !confirm('Opravdu chcete tento záznam smazat?')) return;

    try {
      setError('');
      await entriesApi.delete(entryId, token);
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chyba při mazání záznamu';
      setError(msg);
    }
  }

  // Handle logbook delete
  async function handleDeleteLogbook(logbookId: string) {
    if (!token || !logbookId || !confirm('Opravdu chcete tento lodní deník smazat? Všechny jeho záznamy a trasa budou nevratně smazány.')) return;

    try {
      setError('');
      setLoading(true);
      await logbooksApi.delete(logbookId, token);
      
      const updatedLogbooks = logbooks.filter((l) => l.id !== logbookId);
      setLogbooks(updatedLogbooks);
      
      if (updatedLogbooks.length > 0) {
        setSelectedLogbookId(updatedLogbooks[0].id);
        localStorage.setItem('selectedLogbookId', updatedLogbooks[0].id);
      } else {
        setSelectedLogbookId('');
        localStorage.removeItem('selectedLogbookId');
        setEntries([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chyba při mazání deníku';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Hydration state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900" />
    );
  }

  // Header and layout if not logged in
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="text-center p-6 bg-slate-800 rounded-lg border border-slate-700 max-w-sm">
          <p className="text-lg font-medium mb-4">Pro zobrazení lodního deníku se musíte přihlásit.</p>
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm font-medium transition flex items-center gap-1.5">
            🏠 Domů
          </Link>
          <h1 className="text-xl font-semibold text-slate-100">📖 Lodní deník</h1>
        </div>

        {/* Quick Vessel/Logbook Selection */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Vessel Dropdown */}
          <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-600">
            <span className="text-sm text-slate-400">Loď:</span>
            {vessels.length > 0 ? (
              <select
                value={selectedVesselId}
                onChange={(e) => {
                  setSelectedVesselId(e.target.value);
                  localStorage.setItem('selectedVesselId', e.target.value);
                }}
                className="bg-transparent text-sm font-semibold outline-none border-none text-slate-200 cursor-pointer"
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-800 text-slate-100">
                    {v.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-semibold text-slate-400">Žádná</span>
            )}
            <button
              onClick={() => setShowVesselForm(true)}
              className="text-xs text-blue-400 hover:text-blue-300 ml-1 font-medium"
              title="Přidat loď"
            >
              + Nová
            </button>
          </div>

          {/* Logbook Dropdown */}
          {selectedVesselId && (
            <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-600">
              <span className="text-sm text-slate-400">Deník:</span>
              {logbooks.length > 0 ? (
                <select
                  value={selectedLogbookId}
                  onChange={(e) => {
                    setSelectedLogbookId(e.target.value);
                    localStorage.setItem('selectedLogbookId', e.target.value);
                  }}
                  className="bg-transparent text-sm font-semibold outline-none border-none text-slate-200 cursor-pointer"
                >
                  {logbooks.map((l) => (
                    <option key={l.id} value={l.id} className="bg-slate-800 text-slate-100">
                      {l.title} ({l.status === 'active' ? 'aktivní' : 'uzavřený'})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold text-slate-400">Žádný</span>
              )}
              <button
                onClick={() => setShowLogbookForm(true)}
                className="text-xs text-blue-400 hover:text-blue-300 ml-1 font-medium"
                title="Nový deník"
              >
                + Nový
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Vessel Form Modal */}
        {showVesselForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCreateVessel} className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-bold mb-4">🚢 Přidat nové plavidlo</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Název lodě</label>
                  <input
                    type="text"
                    required
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    placeholder="Např. Santa Maria"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Typ plavidla</label>
                  <select
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Sailing Yacht">Plachetnice (Sailing Yacht)</option>
                    <option value="Motor Yacht">Motorová jachta (Motor Yacht)</option>
                    <option value="Catamaran">Katamarán (Catamaran)</option>
                    <option value="Cargo Ship">Nákladní loď (Cargo Ship)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowVesselForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={vesselLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition"
                >
                  {vesselLoading ? 'Vytvářím...' : 'Vytvořit loď'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Logbook Form Modal */}
        {showLogbookForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCreateLogbook} className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-bold mb-4">📖 Vytvořit nový lodní deník</h2>
              
              {vessels.length === 0 ? (
                <div className="mb-6 p-4 bg-yellow-950/40 border border-yellow-700/60 rounded-lg text-yellow-200 text-sm">
                  <p className="font-medium mb-1">⚠️ Nemáte založené žádné plavidlo</p>
                  <p className="text-xs text-slate-300">Před založením lodního deníku je nutné nejprve vytvořit loď, ke které bude deník patřit.</p>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogbookForm(false);
                        setShowVesselForm(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                    >
                      + Vytvořit loď
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Název / Titul deníku</label>
                    <input
                      type="text"
                      required
                      value={logbookTitle}
                      onChange={(e) => setLogbookTitle(e.target.value)}
                      placeholder="Např. Letní plavba 2026"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Z přístavu</label>
                      <input
                        type="text"
                        value={voyageFrom}
                        onChange={(e) => setVoyageFrom(e.target.value)}
                        placeholder="Např. Split"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Do přístavu</label>
                      <input
                        type="text"
                        value={voyageTo}
                        onChange={(e) => setVoyageTo(e.target.value)}
                        placeholder="Např. Hvar"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogbookForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={logbookLoading || vessels.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition"
                >
                  {logbookLoading ? 'Vytvářím...' : 'Vytvořit deník'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Dynamic States based on data presence */}
        {vessels.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700 p-8 max-w-lg mx-auto">
            <span className="text-5xl mb-4 block">🚢</span>
            <h2 className="text-xl font-bold mb-2">Nemáte žádné lodě</h2>
            <p className="text-slate-400 text-sm mb-6">
              Nejprve si vytvořte svou první loď, abyste k ní mohli založit lodní deník.
            </p>
            <button
              onClick={() => setShowVesselForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              + Vytvořit první loď
            </button>
          </div>
        ) : !selectedVesselId ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Vyberte prosím loď v záhlaví.</p>
          </div>
        ) : logbooks.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700 p-8 max-w-lg mx-auto">
            <span className="text-5xl mb-4 block">📖</span>
            <h2 className="text-xl font-bold mb-2">Nemáte žádné lodní deníky</h2>
            <p className="text-slate-400 text-sm mb-6">
              K této lodi zatím nepatří žádný lodní deník. Založte si jej pro záznam trasy.
            </p>
            <button
              onClick={() => setShowLogbookForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              + Založit lodní deník
            </button>
          </div>
        ) : !selectedLogbookId ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Vyberte nebo vytvořte lodní deník.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Logbook Dashboard & Quick Action Bar */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>📖 {logbooks.find((l) => l.id === selectedLogbookId)?.title}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  ID: {selectedLogbookId} • Celkem {entries.length} záznamů
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteLogbook(selectedLogbookId)}
                  className="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-700/50 rounded-lg font-semibold transition text-sm text-center flex items-center justify-center gap-1.5"
                  title="Smazat celý lodní deník"
                >
                  <span>🗑️ Smazat deník</span>
                </button>
                <Link
                  href={`/logbook/new?logbook_id=${selectedLogbookId}&vessel_id=${selectedVesselId}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition text-sm text-center flex items-center justify-center gap-1.5"
                >
                  <span>+ Nový zápis</span>
                </Link>
              </div>
            </div>

            {/* Entries Display */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-slate-800 rounded-lg"></div>
                  <div className="h-24 bg-slate-800 rounded-lg"></div>
                  <div className="h-24 bg-slate-800 rounded-lg"></div>
                </div>
                <p className="text-slate-400 mt-4">Načítám záznamy...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-800/80 p-8">
                <span className="text-4xl mb-3 block">📝</span>
                <p className="text-slate-400 text-lg">Žádné záznamy v deníku</p>
                <p className="text-slate-500 text-sm mt-1 mb-6">Zatím nebyly přidány žádné záznamy o plavbě.</p>
                <Link
                  href={`/logbook/new?logbook_id=${selectedLogbookId}&vessel_id=${selectedVesselId}`}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg font-medium transition text-sm"
                >
                  Přidat první záznam
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div key={entry.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {/* Top metadata */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded-md font-medium uppercase tracking-wider">
                          {entry.category}
                        </span>
                        <span>•</span>
                        <span>{new Date(entry.timestamp).toLocaleString('cs-CZ')}</span>
                        {entry.is_locked && (
                          <span className="px-1.5 py-0.5 bg-yellow-950/50 border border-yellow-800/30 text-yellow-400 rounded-md text-[10px] flex items-center gap-1">
                            🔒 Uzamčeno
                          </span>
                        )}
                      </div>

                      {/* Main GPS coordinates & navigation stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1.5 border-y border-slate-700/50">
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Pozice</p>
                          <p className="text-sm font-semibold text-slate-200 mt-0.5">
                            {entry.latitude !== null && entry.longitude !== null ? (
                              `${entry.latitude.toFixed(4)}°N, ${entry.longitude.toFixed(4)}°E`
                            ) : (
                              'Nedostupná'
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Rychlost</p>
                          <p className="text-sm font-semibold text-slate-200 mt-0.5">
                            {entry.speed !== null ? `${entry.speed.toFixed(1)} kn` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Kurs</p>
                          <p className="text-sm font-semibold text-slate-200 mt-0.5">
                            {entry.course !== null ? `${entry.course}°` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">ID zápisu</p>
                          <p className="text-xs text-slate-400 font-mono mt-1 select-all" title={entry.id}>
                            {entry.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>

                      {/* Notes / Narrative */}
                      {entry.notes && (
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Poznámky</p>
                          <p className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                            {entry.notes}
                          </p>
                        </div>
                      )}

                      {/* AI Comment */}
                      {entry.ai_comment && (
                        <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg">
                          <p className="text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                            <span>🤖 AI komentář</span>
                          </p>
                          <p className="text-blue-200/90 text-sm mt-1.5 italic whitespace-pre-wrap leading-relaxed">
                            {entry.ai_comment}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick controls on the side */}
                    {!entry.is_locked && (
                      <div className="flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 md:border-l border-slate-700/50 pt-3 md:pt-0 md:pl-4 min-w-[100px]">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/30 rounded-lg transition-all w-full text-center"
                        >
                          Smazat
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
