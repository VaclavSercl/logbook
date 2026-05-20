'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [language, setLanguage] = useState('cs');
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-100">⚙️ Nastavení</h1>
      </header>

      <main className="p-6 max-w-2xl">
        {/* Language */}
        <div className="mb-6">
          <h2 className="text-slate-100 font-medium mb-3">Jazyk</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"
          >
            <option value="cs">Čeština</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="hr">Hrvatski</option>
            <option value="it">Italiano</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </div>

        {/* Theme */}
        <div className="mb-6">
          <h2 className="text-slate-100 font-medium mb-3">Téma</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              🌙 Tmavé
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg ${theme === 'light' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              ☀️ Světlé
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="mb-6">
          <h2 className="text-slate-100 font-medium mb-3">Notifikace</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600"
            />
            <span className="text-slate-300">Povolit push notifikace</span>
          </label>
        </div>

        {/* Modules */}
        <div className="mb-6">
          <h2 className="text-slate-100 font-medium mb-3">Moduly</h2>
          <div className="space-y-2">
            {[
              { name: 'Lodní deník', enabled: true, required: true },
              { name: 'GPS Tracking', enabled: true, required: true },
              { name: 'Mapy', enabled: true, required: false },
              { name: 'Počasí', enabled: false, required: false },
              { name: 'AIS', enabled: false, required: false },
              { name: 'Posádka', enabled: false, required: false },
              { name: 'Lodní pokladna', enabled: false, required: false },
              { name: 'Údržba', enabled: false, required: false },
            ].map((mod) => (
              <div key={mod.name} className="flex items-center justify-between bg-slate-800 rounded-lg p-3 border border-slate-700">
                <div>
                  <p className="text-slate-100">{mod.name}</p>
                  {mod.required && <p className="text-slate-500 text-xs">Povinný modul</p>}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mod.enabled}
                    disabled={mod.required}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
          Uložit nastavení
        </button>
      </main>
    </div>
  );
}
