'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { vesselsApi, crewApi, watchesApi, galleyApi, logbooksApi } from '@/lib/api';

interface CrewMember {
  id: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  name: string;
  role: string;
  nationality: string;
  passport_number: string;
  date_of_birth?: string;
  include_in_watches?: boolean;
  include_in_galley?: boolean;
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Skipper (Kapitán)');
  const [nationality, setNationality] = useState('CZ');
  const [passportNumber, setPassportNumber] = useState('');
  const [dob, setDob] = useState('');
  const [includeInWatches, setIncludeInWatches] = useState(false);
  const [includeInGalley, setIncludeInGalley] = useState(false);

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
    if (!mounted) return;
    const activeToken = token || localStorage.getItem('token');
    if (!activeToken) return;

    vesselsApi.list(activeToken)
      .then((data: any) => {
        const list = data as Vessel[];
        setVessels(list);
        if (list.length > 0) {
          setSelectedVesselId(list[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load vessels:', err);
        if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
        } else {
          setError('Nepodařilo se načíst lodě.');
          setLoading(false);
        }
      });
  }, [mounted, token]);

  // 2. Fetch all crew, active logbook, watches, and galley duties
  const fetchData = async (vesselId: string) => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!activeToken) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Crew
      try {
        const crewData = await crewApi.list(vesselId, activeToken);
        setCrew(crewData as CrewMember[]);
      } catch (err: any) {
        console.error('Failed to fetch crew:', err);
        if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return;
          }
        }
      }

      // 2. Watch groups
      try {
        const groupsData = await watchesApi.listGroups(vesselId, activeToken);
        setWatchGroups(groupsData as WatchGroup[]);
      } catch (err) {
        console.error('Failed to fetch watch groups:', err);
      }

      // 3. Logbooks & duties
      try {
        const logbooksData: any = await logbooksApi.list(vesselId, activeToken);
        const active = Array.isArray(logbooksData) ? logbooksData.find((l: any) => l.status === 'active') : null;
        if (active) {
          setActiveLogbookId(active.id);
          try {
            const schedules = await watchesApi.listSchedules(active.id, activeToken);
            setWatchSchedules(schedules as WatchSchedule[]);
          } catch (e) {}
          try {
            const galley = await galleyApi.listDuties(active.id, activeToken);
            setGalleyDuties(galley as GalleyDuty[]);
          } catch (e) {}
        } else {
          setActiveLogbookId('');
          setWatchSchedules([]);
          setGalleyDuties([]);
        }
      } catch (err) {
        console.error('Failed to fetch logbooks:', err);
      }
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
  const handleRoleSelectChange = (newRole: string) => {
    setRole(newRole);
    const isCrewRole = newRole === 'Crew (Posádka)';
    setIncludeInWatches(isCrewRole);
    setIncludeInGalley(isCrewRole);
  };

  const handleAddCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || localStorage.getItem('token');
    if (!activeToken || !selectedVesselId) return;
    const computedName = `${firstName} ${lastName}`.trim() || nickname || name;
    if (!computedName) return;
    try {
      await crewApi.create({
        vessel_id: selectedVesselId,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname,
        name: computedName,
        role,
        nationality,
        passport_number: passportNumber,
        date_of_birth: dob ? new Date(dob).toISOString() : undefined,
        include_in_watches: includeInWatches,
        include_in_galley: includeInGalley,
      }, activeToken);
      setIsCrewModalOpen(false);
      setFirstName('');
      setLastName('');
      setNickname('');
      setName('');
      setPassportNumber('');
      setDob('');
      setRole('Skipper (Kapitán)');
      setIncludeInWatches(false);
      setIncludeInGalley(false);
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při ukládání.');
    }
  };

  const handleToggleDuty = async (member: CrewMember, dutyType: 'watches' | 'galley', currentVal: boolean) => {
    const activeToken = token || localStorage.getItem('token');
    if (!activeToken) return;
    try {
      const updateData = dutyType === 'watches'
        ? { include_in_watches: !currentVal }
        : { include_in_galley: !currentVal };
      await crewApi.update(member.id, updateData, activeToken);
      fetchData(selectedVesselId);
    } catch (err) {
      alert('Chyba při aktualizaci zařazení do služeb.');
    }
  };

  const handleDeleteCrew = async (id: string) => {
    const activeToken = token || localStorage.getItem('token');
    if (!activeToken || !confirm('Opravdu odebrat člena posádky?')) return;
    try {
      await crewApi.delete(id, activeToken);
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
                  {crew.map((member) => {
                    const inWatches = member.include_in_watches !== false;
                    const inGalley = member.include_in_galley !== false;
                    return (
                      <div
                        key={member.id}
                        className="bg-slate-800 rounded-xl p-5 border border-slate-700/60 shadow flex flex-col justify-between space-y-3 hover:border-slate-600 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-slate-100 font-semibold">
                                {member.first_name || member.last_name
                                  ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                  : member.name}
                              </span>
                              {member.nickname && (
                                <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-700/50">
                                  „{member.nickname}“
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                member.role?.includes('Skipper')
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                                  : member.role?.includes('Guest')
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-700/50'
                                  : 'bg-blue-900/30 text-blue-400 border-blue-800/40'
                              }`}>
                                {member.role || 'Crew (Posádka)'}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs mt-1">
                              Příslušnost: <span className="text-slate-300 font-medium">{member.nationality}</span> • Pas: <span className="text-slate-300 font-medium">{member.passport_number || 'Neuvedeno'}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteCrew(member.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition"
                            title="Odebrat člena"
                          >
                            🗑️
                          </button>
                        </div>

                        {/* Interactive Duty Checkboxes */}
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                            <input
                              type="checkbox"
                              checked={inWatches}
                              onChange={() => handleToggleDuty(member, 'watches', inWatches)}
                              className="w-3.5 h-3.5 text-blue-600 rounded bg-slate-900 border-slate-600"
                            />
                            <span>⚓ Hlídka</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                            <input
                              type="checkbox"
                              checked={inGalley}
                              onChange={() => handleToggleDuty(member, 'galley', inGalley)}
                              className="w-3.5 h-3.5 text-blue-600 rounded bg-slate-900 border-slate-600"
                            />
                            <span>🍳 Kuchyně</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
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
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 border-b border-slate-700 pb-2">Nový člen posádky</h2>
            <form onSubmit={handleAddCrew} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Jméno *</label>
                  <input
                    type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                    placeholder="Např. Jan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Příjmení *</label>
                  <input
                    type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                    placeholder="Např. Novák"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Přezdívka (Nepovinná)</label>
                  <input
                    type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none"
                    placeholder="Např. Hony"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Role / Funkce</label>
                  <select value={role} onChange={(e) => handleRoleSelectChange(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                    <option value="Skipper (Kapitán)">Skipper (Kapitán)</option>
                    <option value="Crew (Posádka)">Crew (Posádka)</option>
                    <option value="Guest (Host)">Guest (Host)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Národnost</label>
                  <input type="text" required value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Číslo pasu</label>
                  <input type="text" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Datum nar.</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none" />
                </div>
              </div>

              {/* Duty Checkboxes */}
              <div className="pt-3 border-t border-slate-700 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Zařazení do služeb</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeInWatches}
                      onChange={(e) => setIncludeInWatches(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded bg-slate-700 border-slate-600"
                    />
                    <span>⚓ Hlídka za kormidlem</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeInGalley}
                      onChange={(e) => setIncludeInGalley(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded bg-slate-700 border-slate-600"
                    />
                    <span>🍳 Služba v kuchyni</span>
                  </label>
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Přiřadit členy posádky zařazené do hlídek</label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-750 p-3 rounded-lg border border-slate-700">
                  {crew.filter(m => m.include_in_watches !== false).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Žádní členové posádky nejsou zařazeni do hlídek za kormidlem.</p>
                  ) : (
                    crew.filter(m => m.include_in_watches !== false).map(member => (
                      <label key={member.id} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={selectedCrewIds.includes(member.id)}
                          onChange={() => toggleCrewSelection(member.id)}
                          className="w-4 h-4 text-blue-650 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                        />
                        <span>{member.name} ({member.role})</span>
                      </label>
                    ))
                  )}
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
                    {crew.filter(m => m.include_in_galley !== false).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Služba: Úklid (Cleaner)</label>
                  <select required value={cleanerId} onChange={(e) => setCleanerId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none">
                    <option value="">-- Vyberte --</option>
                    {crew.filter(m => m.include_in_galley !== false).map(m => (
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
