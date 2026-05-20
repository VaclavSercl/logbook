'use client';

import { useState } from 'react';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<string[]>([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení galerie se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">📸 Galerie</h1>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
            + Nahrát fotku
          </button>
        </div>
      </header>

      <main className="p-6">
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">Žádné fotky</p>
            <p className="text-slate-500 text-sm mt-2">
              Nahrajte první fotku s GPS souřadnicemi
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, i) => (
              <div key={i} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                <img src={photo} alt={`Fotka ${i + 1}`} className="w-full h-48 object-cover" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
