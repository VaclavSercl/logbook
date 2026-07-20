'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { vesselsApi, crewApi, watchesApi, galleyApi, logbooksApi } from '@/lib/api';

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

interface WatchGroup {
  id: string;
  vessel_id: string;
  name: string;
  members: CrewMember[];
  created_at: string;
}

interface WatchSchedule {
  id: string;
  logbook_id: string;
  watch_group_id: string;
  watch_group: WatchGroup;
  start_time: string;
  end_time: string;
  notes: string;
  created_at: string;
}

interface GalleyDuty {
  id: string;
  logbook_id: string;
  date: string;
  cook_id: string;
  cook: CrewMember;
  cleaner_id: string;
  cleaner: CrewMember;
  notes: string;
  created_at: string;
}

export default function CrewPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [activeLogbookId, setActiveLogbookId] = useState<string>('');
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [watchGroups, setWatchGroups] = useState<WatchGroup[]>([]);
  const [watchSchedules, setWatchSchedules] = useState<WatchSchedule[]>([]);
  const [galleyDuties, setGalleyDuties] = useState<GalleyDuty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'crew' | 'watches' | 'galley'>('crew');

  // Modals / forms states
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isGalleyModalOpen, setIsGalleyModalOpen] = useState(false);

  // Crew Form
  const [name, setName] = useState('');
  const [role, setRole] = useState('Velitel lodi');
  const [nationality, setNationality] = useState('CZ');
  const [passportNumber, setPassportNumber] = useState('');
  const [dob, setDob] = useState('');

  // Watch Group Form
  const [groupName, setGroupName] = useState('');
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);

  // Watch Schedule Form
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  // Galley Duty Form
  const [galleyDate, setGalleyDate] = useState('');
  const [cookId, setCookId] = useState('');
  const [cleanerId, setCleanerId] = useState('');
  const [galleyNotes, setGalleyNotes] = useState('');

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

  // 2. Fetch all crew, active logbook, watches, and galley duties
  const fetchData = async (vesselId: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Crew
      const crewData = await crewApi.list(vesselId, token);
      setCrew(crewData as CrewMember[]);

      // Watch groups
      const groupsData = await watchesApi.listGroups(vesselId, token);
      setWatchGroups(groupsData as WatchGroup[]);

      // Logbooks -> active one
      const logbooksData: any = await logbooksApi.list(vesselId, token);
      const active = logbooksData.find((l: any) => l.status === 'active');
      if (active) {
        setActiveLogbookId(active.id);
        
        // Fetch schedules
        const schedules = await watchesApi.listSchedules(active.id, token);
        setWatchSchedules(schedules as WatchSchedule[]);

        // Fetch galley duties
        const galley = await galleyApi.listDuties(active.id, token);
        setGalleyDuties(galley as GalleyDuty[]);
      } else {
        setActiveLogbookId('');
        setWatchSchedules([]);
        setGalleyDuties([]);
      }
    } catch (err) {
      console.error('Failed to fetch crew/duties:', err);
      setError('Nepodařilo se načíst data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVesselId) {
      fetchData(selectedVesselId);
    }
  }, [selectedVesselId]);

  // ─── CREW OPERATIONS ───
  const handleAddCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVesselId || !name) return;
    try {
      await crewApi.create({
        vessel_id: selectedVesselId,
        name,
        role,
        nationality,
        passport_number: passportNumber,
        date_of_birth: dob ? new Date(dob).toISOString() : undefined,
      }, token);
      setIsCrewModalOpen(false);
      setName('');
      setPassportNumber('');
      setDob('');
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při ukládání.');
    }
  };

  const handleDeleteCrew = async (id: string) => {
    if (!token || !confirm('Opravdu odebrat člena posádky?')) return;
    try {
      await crewApi.delete(id, token);
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při mazání.');
    }
  };

  // ─── WATCH GROUP OPERATIONS ───
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVesselId || !groupName) return;
    try {
      await watchesApi.createGroup({
        vessel_id: selectedVesselId,
        name: groupName,
        member_ids: selectedCrewIds,
      }, token);
      setIsGroupModalOpen(false);
      setGroupName('');
      setSelectedCrewIds([]);
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při ukládání hlídky.');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!token || !confirm('Opravdu smazat tuto hlídkovou skupinu?')) return;
    try {
      await watchesApi.deleteGroup(id, token);
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při mazání hlídky.');
    }
  };

  // ─── WATCH SCHEDULE OPERATIONS ───
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeLogbookId || !selectedGroupId || !startTime || !endTime) return;
    try {
      await watchesApi.createSchedule({
        logbook_id: activeLogbookId,
        watch_group_id: selectedGroupId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        notes: scheduleNotes,
      }, token);
      setIsScheduleModalOpen(false);
      setSelectedGroupId('');
      setStartTime('');
      setEndTime('');
      setScheduleNotes('');
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při zápisu do rozvrhu.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!token || !confirm('Opravdu smazat položku z rozvrhu?')) return;
    try {
      await watchesApi.deleteSchedule(id, token);
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při mazání.');
    }
  };

  // ─── GALLEY DUTY OPERATIONS ───
  const handleAddGalley = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeLogbookId || !galleyDate || !cookId || !cleanerId) return;
    try {
      await galleyApi.createDuty({
        logbook_id: activeLogbookId,
        date: new Date(galleyDate).toISOString(),
        cook_id: cookId,
        cleaner_id: cleanerId,
        notes: galleyNotes,
      }, token);
      setIsGalleyModalOpen(false);
      setGalleyDate('');
      setCookId('');
      setCleanerId('');
      setGalleyNotes('');
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při ukládání služby.');
    }
  };

  const handleDeleteGalley = async (id: string) => {
    if (!token || !confirm('Opravdu smazat tuto službu v kuchyni?')) return;
    try {
      await galleyApi.deleteDuty(id, token);
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při odstraňování.');
    }
  };

  const toggleCrewSelection = (id: string) => {
    setSelectedCrewIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  // Hydration state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900" />
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení posádky se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      <Navbar />
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">👥 Služba & Posádka</h1>
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

          {activeTab === 'crew' && (
            <button
              onClick={() => setIsCrewModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
            >
              + Přidat člena
            </button>
          )}
          {activeTab === 'watches' && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-650 text-white rounded-lg font-medium text-sm transition"
              >
                + Vytvořit hlídku
              </button>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                disabled={!activeLogbookId}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
              >
                + Naplánovat střídání
              </button>
            </div>
          )}
          {activeTab === 'galley' && (
            <button
              onClick={() => setIsGalleyModalOpen(true)}
              disabled={!activeLogbookId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
            >
              + Zadat službu
            </button>
          )}
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="bg-slate-800 border-b border-slate-700 px-6">
        <div className="flex gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => setActiveTab('crew')}
            className={`py-3 px-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'crew' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Členové posádky
          </button>
          <button
            onClick={() => setActiveTab('watches')}
            className={`py-3 px-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'watches' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚓ Lodní hlídky
          </button>
          <button
            onClick={() => setActiveTab('galley')}
            className={`py-3 px-2 font-medium text-sm border-b-2 transition ${
              activeTab === 'galley' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🍳 Služby v kuchyni
          </button>
        </div>
      </div>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4 text-sm">Načítám rozhraní...</p>
          </div>
        ) : error ? (
          <p className="text-red-400 text-center py-12">⚠️ {error}</p>
        ) : (
          <>
            {/* ── TAB 1: CREW MEMBERS ── */}
            {activeTab === 'crew' && (
              crew.length === 0 ? (
                <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700 max-w-lg mx-auto">
                  <span className="text-4xl">👥</span>
                  <p className="text-slate-400 text-lg mt-4">Žádná posádka</p>
                  <p className="text-slate-500 text-sm mt-1 mb-6">Přidejte prvního člena posádky.</p>
                  <button
                    onClick={() => setIsCrewModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
                  >
                    Přidat člena
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {crew.map((member) => (
                    <div
                      key={member.id}
                      className="bg-slate-800 rounded-xl p-5 border border-slate-700/60 shadow flex items-center justify-between hover:border-slate-600 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-100 font-semibold">{member.name}</span>
                          <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded-full border border-blue-800/40">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-2">
                          Příslušnost: <span className="text-slate-300 font-medium">{member.nationality}</span> • Pas: <span className="text-slate-300 font-medium">{member.passport_number || 'Neuvedeno'}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCrew(member.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── TAB 2: WATCHKEEPING ── */}
            {activeTab === 'watches' && (
              <div className="space-y-8">
                {/* Watch Groups */}
                <div>
                  <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">🛡️ Hlídkové skupiny</h2>
                  {watchGroups.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">Nejsou vytvořeny žádné hlídkové skupiny (např. Hlídka Alfa/Beta).</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {watchGroups.map((group) => (
                        <div key={group.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-slate-200">{group.name}</h3>
                              <button
                                onClick={() => handleDeleteGroup(group.id)}
                                className="text-slate-500 hover:text-red-400 text-xs transition"
                              >
                                Smazat
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {group.members.map(m => (
                                <span key={m.id} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                                  {m.name}
                                </span>
                              ))}
                              {group.members.length === 0 && (
                                <span className="text-slate-500 text-xs italic">Bez posádky</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Schedules */}
                <div>
                  <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">📅 Časový rozvrh střídání</h2>
                  {!activeLogbookId ? (
                    <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-4 text-yellow-400 text-sm">
                      ⚠️ Pro plánování střídání hlídek musíte mít spuštěnou **aktivní plavbu** v lodním deníku.
                    </div>
                  ) : watchSchedules.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">Zatím nebyly naplánovány žádné hlídky.</p>
                  ) : (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                      <div className="divide-y divide-slate-700/60">
                        {watchSchedules.map((sched) => (
                          <div key={sched.id} className="p-4 flex items-center justify-between hover:bg-slate-750 transition">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-xs font-bold rounded">
                                  {sched.watch_group.name}
                                </span>
                                <span className="text-slate-400 text-xs">
                                  {new Date(sched.start_time).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                  {' — '}
                                  {new Date(sched.end_time).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                </span>
                              </div>
                              {sched.notes && <p className="text-slate-400 text-xs italic">{sched.notes}</p>}
                            </div>
                            <button
                              onClick={() => handleDeleteSchedule(sched.id)}
                              className="text-slate-500 hover:text-red-400 text-sm transition"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: GALLEY DUTIES ── */}
            {activeTab === 'galley' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">🍳 Rozpis služeb v kuchyni</h2>
                {!activeLogbookId ? (
                  <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-4 text-yellow-400 text-sm">
                    ⚠️ Pro plánování kuchyňských služeb musíte mít spuštěnou **aktivní plavbu** v lodním deníku.
                  </div>
                ) : galleyDuties.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">Zatím nebyly zadány žádné kuchyňské služby.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {galleyDuties.map((duty) => (
                      <div key={duty.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700/60 shadow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-semibold text-slate-100">
                              📅 {new Date(duty.date).toLocaleDateString('cs-CZ')}
                            </span>
                            <button
                              onClick={() => handleDeleteGalley(duty.id)}
                              className="text-slate-500 hover:text-red-400 text-sm transition"
                            >
                              🗑️
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-slate-400 uppercase tracking-wide font-bold">Kuchař:</span>
                              <span className="text-slate-200 font-semibold">{duty.cook.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-slate-400 uppercase tracking-wide font-bold">Pomocník:</span>
                              <span className="text-slate-200 font-semibold">{duty.cleaner.name}</span>
                            </div>
                          </div>
                          {duty.notes && (
                            <p className="text-slate-400 text-xs italic mt-3 bg-slate-900/30 p-2 rounded border border-slate-700/40">
                              {duty.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── MODALS ── */}
      {/* 1. Add Crew Modal */}
      {isCrewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Nový člen posádky</h2>
            <form onSubmit={handleAddCrew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Jméno a příjmení</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  placeholder="Např. Jan Novák"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Role / Funkce</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                    <option value="Velitel lodi">Velitel lodi</option>
                    <option value="První důstojník">První důstojník</option>
                    <option value="Kormidelník">Kormidelník</option>
                    <option value="Plavčík">Plavčík</option>
                    <option value="Host">Host</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Národnost</label>
                  <input type="text" required value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Číslo pasu</label>
                  <input type="text" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Datum narození</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setIsCrewModalOpen(false)} className="px-4 py-2 bg-transparent text-slate-300 hover:bg-slate-700 rounded-lg text-sm transition">Zrušit</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">Uložit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Nová hlídková skupina</h2>
            <form onSubmit={handleAddGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Název hlídky</label>
                <input
                  type="text" required value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                  placeholder="Např. Hlídka Alfa, Port Watch..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Přiřadit členy posádky</label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-750 p-3 rounded-lg border border-slate-700">
                  {crew.map(member => (
                    <label key={member.id} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={selectedCrewIds.includes(member.id)}
                        onChange={() => toggleCrewSelection(member.id)}
                        className="w-4 h-4 text-blue-650 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                      />
                      <span>{member.name} ({member.role})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 bg-transparent text-slate-300 hover:bg-slate-700 rounded-lg text-sm transition">Zrušit</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">Vytvořit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Naplánovat střídání hlídky</h2>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Vybrat hlídkovou skupinu</label>
                <select required value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                  <option value="">-- Vyberte skupinu --</option>
                  {watchGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Začátek hlídky</label>
                  <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Konec hlídky</label>
                  <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Poznámka / Úkoly (Nepovinné)</label>
                <textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none h-20" placeholder="Např. Očekává se zhoršení větru, sledovat radar..." />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 bg-transparent text-slate-300 hover:bg-slate-700 rounded-lg text-sm transition">Zrušit</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">Naplánovat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Galley Duty Modal */}
      {isGalleyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Nová služba v kuchyni</h2>
            <form onSubmit={handleAddGalley} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Datum služby</label>
                <input type="date" required value={galleyDate} onChange={(e) => setGalleyDate(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Služba: Kuchař (Cook)</label>
                  <select required value={cookId} onChange={(e) => setCookId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                    <option value="">-- Vyberte --</option>
                    {crew.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Služba: Úklid (Cleaner)</label>
                  <select required value={cleanerId} onChange={(e) => setCleanerId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                    <option value="">-- Vyberte --</option>
                    {crew.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Poznámka / Jídelníček (Nepovinné)</label>
                <textarea value={galleyNotes} onChange={(e) => setGalleyNotes(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none h-20" placeholder="Např. Boloňské špagety, kontrolovat pitnou vodu..." />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setIsGalleyModalOpen(false)} className="px-4 py-2 bg-transparent text-slate-300 hover:bg-slate-700 rounded-lg text-sm transition">Zrušit</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">Uložit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
