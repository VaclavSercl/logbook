'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function LogbookPage() {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    // TODO: fetch entries from API
    setLoading(false);
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení deníku se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">📖 Lodní deník</h1>
          <Link
            href="/logbook/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            + Nový zápis
          </Link>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <p className="text-slate-400">Načítám...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Žádné záznamy</p>
            <p className="text-slate-500 text-sm mt-2">Přidejte první zápis do deníku</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EntryCard({ entry }: { entry: LogbookEntry }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-300 text-sm">
            {new Date(entry.timestamp).toLocaleString('cs-CZ')}
          </p>
          <p className="text-slate-100 font-medium mt-1">
            {entry.latitude?.toFixed(4)}°N, {entry.longitude?.toFixed(4)}°E
          </p>
          {entry.speed && <p className="text-slate-400 text-sm">Rychlost: {entry.speed} kn</p>}
          {entry.course && <p className="text-slate-400 text-sm">Kurs: {entry.course}°</p>}
          {entry.notes && <p className="text-slate-300 mt-2">{entry.notes}</p>}
          {entry.ai_comment && (
            <p className="text-blue-300 text-sm mt-2 italic">🤖 {entry.ai_comment}</p>
          )}
        </div>
        <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
          {entry.category}
        </span>
      </div>
    </div>
  );
}
