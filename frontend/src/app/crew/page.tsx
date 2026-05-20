'use client';

import { useEffect, useState } from 'react';

interface CrewMember {
  id: string;
  name: string;
  role: string;
  nationality: string;
  passport_number: string;
}

interface Watch {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  crew_id: string;
}

export default function CrewPage() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    // TODO: fetch crew from API
    setLoading(false);
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení posádky se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">👥 Posádka</h1>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
            + Přidat člena
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Crew list */}
        <div className="mb-8">
          <h2 className="text-slate-100 font-medium mb-4">Členové posádky</h2>
          {loading ? (
            <p className="text-slate-400">Načítám...</p>
          ) : crew.length === 0 ? (
            <div className="text-center py-8 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-slate-400">Žádní členové posádky</p>
              <p className="text-slate-500 text-sm mt-2">Přidejte prvního člena</p>
            </div>
          ) : (
            <div className="space-y-2">
              {crew.map((member) => (
                <div key={member.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex items-center justify-between">
                  <div>
                    <p className="text-slate-100 font-medium">{member.name}</p>
                    <p className="text-slate-400 text-sm">{member.role} • {member.nationality}</p>
                  </div>
                  <span className="text-slate-500 text-sm">{member.passport_number}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watch organization */}
        <div>
          <h2 className="text-slate-100 font-medium mb-4">Organizace hlídek</h2>
          {watches.length === 0 ? (
            <div className="text-center py-8 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-slate-400">Žádné hlídky</p>
              <p className="text-slate-500 text-sm mt-2">Vytvořte první hlídku</p>
            </div>
          ) : (
            <div className="space-y-2">
              {watches.map((watch) => (
                <div key={watch.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-slate-100 font-medium">{watch.name}</p>
                  <p className="text-slate-400 text-sm">{watch.start_time} — {watch.end_time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
