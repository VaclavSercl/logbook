'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { vesselsApi, cashboxApi } from '@/lib/api';

interface Vessel {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  vessel_id: string;
  payer_name?: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  created_at: string;
}

export default function CashboxPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Expense Form State
  const [payerName, setPayerName] = useState<string>('Kapitán');
  const [category, setCategory] = useState<string>('proviant');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

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
  }, [token, mounted]);

  const fetchExpenses = async (vesselId: string) => {
    if (!token || !vesselId) return;
    setLoading(true);
    setError(null);
    try {
      const data: any = await cashboxApi.listExpenses(vesselId, token);
      setExpenses(data as Expense[]);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setError('Nepodařilo se načíst položky pokladny.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVesselId) {
      fetchExpenses(selectedVesselId);
    }
  }, [selectedVesselId, mounted, token]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVesselId || !amount || !description) return;
    setSubmitting(true);
    try {
      await cashboxApi.createExpense({
        vessel_id: selectedVesselId,
        payer_name: payerName,
        category,
        amount: parseFloat(amount),
        currency,
        description,
      }, token);

      setDescription('');
      setAmount('');
      await fetchExpenses(selectedVesselId);
    } catch (err) {
      alert('Chyba při zapisování výdaje.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!token || !confirm('Opravdu odstranit tento výdaj?')) return;
    try {
      await cashboxApi.deleteExpense(id, token);
      await fetchExpenses(selectedVesselId);
    } catch (err) {
      alert('Chyba při mazání výdaje.');
    }
  };

  const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'proviant': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">🛒 Proviant</span>;
      case 'palivo': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">⛽ Palivo</span>;
      case 'pristav': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800">⚓ Přístav</span>;
      case 'oprava': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">🛠️ Oprava</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">📦 Ostatní</span>;
    }
  };

  if (!mounted) return <div className="min-h-screen bg-slate-900" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>💰</span> Lodní Pokladna & Výdaje
            </h1>
            <p className="text-sm text-slate-400">
              Přehled výdajů posádky na nákup proviantu, paliva, přístavních poplatků a oprav během plavby.
            </p>
          </div>

          {vessels.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-sm text-slate-400 font-medium">Loď:</span>
              <select
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    ⛵ {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Expenses List & Stats */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Celkové Výdaje Plavby</span>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                    {totalAmount.toFixed(2)} <span className="text-lg font-normal text-slate-400">EUR</span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  Počet transakcí: <span className="font-bold text-white">{expenses.length}</span>
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📜</span> Seznam Výdajů
                </h3>

                {expenses.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">Zatím nebyly vloženy žádné výdaje.</p>
                ) : (
                  <div className="space-y-3">
                    {expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getCategoryBadge(exp.category)}
                            <span className="font-semibold text-white text-sm">{exp.description}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Zaplatil: <span className="text-slate-200 font-medium">{exp.payer_name}</span> • {new Date(exp.date).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right font-extrabold text-emerald-400 text-lg">
                            {exp.amount.toFixed(2)} <span className="text-xs text-slate-400 font-normal">{exp.currency}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/50"
                            title="Smazat"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add Expense Form */}
            <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span> Přidat Výdaj
              </h3>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Popis Výdaje</label>
                  <input
                    type="text"
                    required
                    placeholder="Např. Nákup v Lidlu, Nafta na čerpací stanici"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Částka</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Měna</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="CZK">CZK (Kč)</option>
                      <option value="USD">USD ($)</option>
                      <option value="HRK">HRK</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Kategorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="proviant">🛒 Proviant / Jídlo & Pití</option>
                    <option value="palivo">⛽ Palivo / Nafta</option>
                    <option value="pristav">⚓ Přístavní Poplatky / Marina</option>
                    <option value="oprava">🛠️ Oprava / Údržba</option>
                    <option value="ostatni">📦 Ostatní</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Kdo platil</label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>💰</span> Zapsat Výdaj
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
