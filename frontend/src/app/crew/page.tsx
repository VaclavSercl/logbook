'use client';

import { useEffect, useState } from 'react';
import { vesselsApi, crewApi } from '@/lib/api';

interface CrewMember {
  id: string;
  name: string;
  role: string;
  nationality: string;
  passport_number: string;
  date_of_birth?: string;
  joined_at: string;
}

interface Vessel {
  id: string;
  name: string;
}

export default function CrewPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Velitel lodi');
  const [nationality, setNationality] = useState('CZ');
  const [passportNumber, setPassportNumber] = useState('');
  const [dob, setDob] = useState('');

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

  // 2. Fetch crew members when vessel changes
  const fetchCrew = async (vesselId: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await crewApi.list(vesselId, token);
      setCrew(data as CrewMember[]);
    } catch (err) {
      console.error('Failed to fetch crew:', err);
      setError('Nepodařilo se načíst posádku.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVesselId) {
      fetchCrew(selectedVesselId);
    }
  }, [selectedVesselId]);

  // 3. Add crew member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVesselId || !name) return;
    try {
      await crewApi.create(
        {
          vessel_id: selectedVesselId,
          name,
          role,
          nationality,
          passport_number: passportNumber,
          date_of_birth: dob ? new Date(dob).toISOString() : undefined,
        },
        token
      );
      setIsModalOpen(false);
      // Reset form
      setName('');
      setRole('Člen posádky');
      setPassportNumber('');
      setDob('');
      // Reload crew
      fetchCrew(selectedVesselId);
    } catch (err) {
      console.error('Failed to add crew member:', err);
      alert('Chyba při ukládání člena posádky.');
    }
  };

  // 4. Delete crew member
  const handleDeleteMember = async (id: string) => {
    if (!token || !confirm('Opravdu chcete odebrat tohoto člena posádky?')) return;
    try {
      await crewApi.delete(id, token);
      fetchCrew(selectedVesselId);
    } catch (err) {
      console.error('Failed to delete crew member:', err);
      alert('Chyba při odstraňování.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení posádky se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">👥 Posádka</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Vessel Selector */}
          {vessels.length > 0 && (
            <select
              value={selectedVesselId}
              onChange={(e) => setSelectedVesselId(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
          >
            + Přidat člena
          </button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4 text-sm">Načítám seznam posádky...</p>
          </div>
        ) : error ? (
          <p className="text-red-400 text-center py-12">⚠️ {error}</p>
        ) : crew.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700 max-w-lg mx-auto">
            <span className="text-4xl">👥</span>
            <p className="text-slate-400 text-lg mt-4">Žádní členové posádky</p>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              Přidejte kapitána a členy posádky pro splnění předpisů.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
            >
              Přidat prvního člena
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {crew.map((member) => (
              <div
                key={member.id}
                className="bg-slate-800 rounded-xl p-5 border border-slate-700/60 shadow flex items-center justify-between hover:border-slate-600 transition"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-slate-100 font-semibold text-base">{member.name}</p>
                    <span className="px-2.5 py-0.5 bg-blue-900/40 text-blue-400 border border-blue-800/40 text-xs font-semibold rounded-full">
                      {member.role}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1.5">
                    Státní příslušnost: <span className="text-slate-200 font-medium">{member.nationality}</span> • Pas: <span className="text-slate-200 font-medium">{member.passport_number || 'Neuvedeno'}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMember(member.id)}
                  className="p-2 text-slate-500 hover:text-red-400 transition"
                  title="Odebrat z posádky"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Member Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Nový člen posádky</h2>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Jméno a příjmení</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Např. Václav Šercl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Role / Funkce</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                    >
                      <option value="Velitel lodi">Velitel lodi</option>
                      <option value="První důstojník">První důstojník</option>
                      <option value="Kormidelník">Kormidelník</option>
                      <option value="Plavčík">Plavčík</option>
                      <option value="Host">Host</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Národnost</label>
                    <input
                      type="text"
                      required
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                      placeholder="CZ, SK, EN"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Číslo pasu</label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                      placeholder="Volitelné"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Datum narození</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-transparent hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Uložit
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
