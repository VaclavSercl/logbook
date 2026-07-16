'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { vesselsApi } from '@/lib/api';

interface Vessel {
  id: string;
  owner_id: string;
  name: string;
  imo?: string | null;
  mmsi?: string | null;
  call_sign?: string | null;
  port?: string | null;
  vessel_type?: string | null;
  length?: number | null;
  beam?: number | null;
  draft?: number | null;
  year_built?: number | null;
  flag_state?: string | null;
  created_at: string;
}

export default function VesselsPage() {
  const router = useRouter();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [currentVesselId, setCurrentVesselId] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Fields
  const [name, setName] = useState('');
  const [imo, setImo] = useState('');
  const [mmsi, setMmsi] = useState('');
  const [callSign, setCallSign] = useState('');
  const [port, setPort] = useState('');
  const [vesselType, setVesselType] = useState('Sailing Yacht');
  const [length, setLength] = useState('');
  const [beam, setBeam] = useState('');
  const [draft, setDraft] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [flagState, setFlagState] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadVessels();
  }, [token]);

  async function loadVessels() {
    try {
      setLoading(true);
      setError('');
      const data = await vesselsApi.list(token!);
      setVessels(data);
    } catch (err: any) {
      setError(err?.message || 'Chyba při načítání plavidel');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setIsEditing(false);
    setCurrentVesselId('');
    setName('');
    setImo('');
    setMmsi('');
    setCallSign('');
    setPort('');
    setVesselType('Sailing Yacht');
    setLength('');
    setBeam('');
    setDraft('');
    setYearBuilt('');
    setFlagState('');
    setShowForm(true);
  }

  function handleOpenEdit(vessel: Vessel) {
    setIsEditing(true);
    setCurrentVesselId(vessel.id);
    setName(vessel.name || '');
    setImo(vessel.imo || '');
    setMmsi(vessel.mmsi || '');
    setCallSign(vessel.call_sign || '');
    setPort(vessel.port || '');
    setVesselType(vessel.vessel_type || 'Sailing Yacht');
    setLength(vessel.length ? String(vessel.length) : '');
    setBeam(vessel.beam ? String(vessel.beam) : '');
    setDraft(vessel.draft ? String(vessel.draft) : '');
    setYearBuilt(vessel.year_built ? String(vessel.year_built) : '');
    setFlagState(vessel.flag_state || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Název plavidla je povinný');
      return;
    }

    const payload: Record<string, any> = {
      name,
      imo: imo.trim() || null,
      mmsi: mmsi.trim() || null,
      call_sign: callSign.trim() || null,
      port: port.trim() || null,
      vessel_type: vesselType || null,
      length: length ? parseFloat(length) : null,
      beam: beam ? parseFloat(beam) : null,
      draft: draft ? parseFloat(draft) : null,
      year_built: yearBuilt ? parseInt(yearBuilt, 10) : null,
      flag_state: flagState.trim() || null,
    };

    try {
      setError('');
      setSuccess('');
      if (isEditing) {
        const updated = await vesselsApi.update(currentVesselId, payload, token!);
        setVessels((prev) => prev.map((v) => (v.id === currentVesselId ? updated : v)));
        setSuccess('Plavidlo bylo úspěšně aktualizováno');
      } else {
        const created = await vesselsApi.create(payload, token!);
        setVessels((prev) => [...prev, created]);
        setSuccess('Plavidlo bylo úspěšně vytvořeno');
      }
      setShowForm(false);
    } catch (err: any) {
      setError(err?.message || 'Chyba při ukládání plavidla');
    }
  }

  async function handleDelete(vesselId: string, vesselName: string) {
    if (!confirm(`Opravdu chcete smazat plavidlo "${vesselName}"? Smazáním plavidla dojde k odstranění všech přidružených deníků, záznamů i GPS pozic.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await vesselsApi.delete(vesselId, token!);
      setVessels((prev) => prev.filter((v) => v.id !== vesselId));
      setSuccess(`Plavidlo "${vesselName}" bylo smazáno`);
      
      // Update local storage if deleted vessel was active
      const savedVesselId = localStorage.getItem('selectedVesselId');
      if (savedVesselId === vesselId) {
        localStorage.removeItem('selectedVesselId');
        localStorage.removeItem('selectedLogbookId');
      }
    } catch (err: any) {
      setError(err?.message || 'Chyba při mazání plavidla');
    }
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm font-medium transition flex items-center gap-1.5">
            🏠 Domů
          </Link>
          <h1 className="text-xl font-semibold text-slate-100">🚢 Správa plavidel</h1>
        </div>
        <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition">
          Zpět na Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="p-6 flex-1 max-w-7xl w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-slate-400">Moje flotila</h2>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            + Přidat plavidlo
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/40 border border-red-700 text-red-200 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-emerald-900/40 border border-emerald-700 text-emerald-200 rounded-lg text-sm">
            ✅ {success}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : vessels.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-5xl block mb-4">⚓</span>
            <p className="text-slate-400 mb-4">Zatím nemáte zaregistrované žádné plavidlo.</p>
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition inline-flex items-center gap-2 text-sm"
            >
              Vytvořit první plavidlo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vessels.map((v) => (
              <div key={v.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                {/* Vessel Header */}
                <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{v.name}</h3>
                    <span className="inline-block mt-1 text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full font-medium">
                      {v.vessel_type || 'Nespecifikováno'}
                    </span>
                  </div>
                  <span className="text-2xl" title="Typ lodi">
                    {v.vessel_type?.toLowerCase().includes('yacht') ? '⛵' : '🚢'}
                  </span>
                </div>

                {/* Technical details */}
                <div className="p-5 flex-1 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 text-xs uppercase font-semibold">Port</p>
                      <p className="text-slate-200 font-medium">{v.port || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase font-semibold">Vlajka (Flag)</p>
                      <p className="text-slate-200 font-medium">{v.flag_state || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-700/50">
                    <div className="text-center">
                      <p className="text-slate-500 text-xs uppercase font-semibold">Délka (L)</p>
                      <p className="text-slate-200 font-bold mt-0.5">{v.length ? `${v.length} m` : 'N/A'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs uppercase font-semibold">Šířka (B)</p>
                      <p className="text-slate-200 font-bold mt-0.5">{v.beam ? `${v.beam} m` : 'N/A'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs uppercase font-semibold">Ponor (T)</p>
                      <p className="text-slate-200 font-bold mt-0.5">{v.draft ? `${v.draft} m` : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-900/30 p-3 rounded-lg border border-slate-800 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">IMO:</span>
                      <span className="text-slate-200 font-mono font-medium">{v.imo || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">MMSI:</span>
                      <span className="text-slate-200 font-mono font-medium">{v.mmsi || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Volací znak (Call Sign):</span>
                      <span className="text-slate-200 font-mono font-medium">{v.call_sign || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/50 pt-1 mt-1">
                      <span className="text-slate-400">Rok stavby:</span>
                      <span className="text-slate-200 font-medium">{v.year_built || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-800/80 border-t border-slate-700/50 flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(v)}
                    className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-xs font-semibold transition"
                  >
                    📝 Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id, v.name)}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg text-xs font-semibold transition"
                  >
                    🗑️ Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal form */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-slate-850 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-100">
                  {isEditing ? '📝 Upravit plavidlo' : '🚢 Nové plavidlo'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-white transition text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Název lodi *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Např. Njoror"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Typ plavidla (dobrovolné)</label>
                    <select
                      value={vesselType}
                      onChange={(e) => setVesselType(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:border-blue-500 outline-none cursor-pointer"
                    >
                      <option value="Sailing Yacht">Plachetnice (Sailing Yacht)</option>
                      <option value="Motor Yacht">Motorová jachta (Motor Yacht)</option>
                      <option value="Catamaran">Katamarán (Catamaran)</option>
                      <option value="Cargo Ship">Nákladní loď (Cargo Ship)</option>
                      <option value="Fishing Boat">Rybářská loď (Fishing Boat)</option>
                      <option value="Rib / Dinghy">Člun (RIB/Dinghy)</option>
                    </select>
                  </div>

                  {/* Port */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Domovský přístav (dobrovolné)</label>
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="Např. Split, Chorvatsko"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* IMO */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">IMO číslo (dobrovolné)</label>
                    <input
                      type="text"
                      value={imo}
                      onChange={(e) => setImo(e.target.value)}
                      placeholder="7-místné číslo"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* MMSI */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">MMSI číslo (dobrovolné)</label>
                    <input
                      type="text"
                      value={mmsi}
                      onChange={(e) => setMmsi(e.target.value)}
                      placeholder="9-místné číslo"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Call Sign */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Volací znak (Call Sign) (dobrovolné)</label>
                    <input
                      type="text"
                      value={callSign}
                      onChange={(e) => setCallSign(e.target.value)}
                      placeholder="Např. ABCD1"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Flag state */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Vlajkový stát (Kód) (dobrovolné)</label>
                    <input
                      type="text"
                      value={flagState}
                      onChange={(e) => setFlagState(e.target.value)}
                      placeholder="Např. CZ, HR, DE"
                      maxLength={5}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Dimensions */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Celková délka (LOA) [m] (dobrovolné)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="Např. 14.27"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Šířka (Beam) [m] (dobrovolné)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={beam}
                      onChange={(e) => setBeam(e.target.value)}
                      placeholder="Např. 4.35"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Ponor (Draft) [m] (dobrovolné)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Např. 2.10"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Year Built */}
                  <div>
                    <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Rok stavby (dobrovolné)</label>
                    <input
                      type="number"
                      value={yearBuilt}
                      onChange={(e) => setYearBuilt(e.target.value)}
                      placeholder="Např. 2018"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-700 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    {isEditing ? 'Uložit změny' : 'Vytvořit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
