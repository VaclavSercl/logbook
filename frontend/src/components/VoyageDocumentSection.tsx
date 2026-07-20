'use client';

import React, { useState, useEffect } from 'react';
import { documentsApi } from '@/lib/api';

interface DocumentItem {
  id: string;
  logbook_id?: string;
  vessel_id?: string;
  doc_type: string;
  title: string;
  file_path?: string;
  url?: string;
  file_size?: number;
  file_type?: string;
  ai_status: string;
  ai_summary?: string;
  created_at?: string;
}

interface Props {
  logbookId?: string;
  vesselId?: string;
  token?: string;
  onDataUpdated?: () => void;
}

export default function VoyageDocumentSection({ logbookId, vesselId, token, onDataUpdated }: Props) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pathInput, setPathInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showAddPath, setShowAddPath] = useState(false);
  const [showAddUrl, setShowAddUrl] = useState(false);

  const fetchDocs = async () => {
    if (!logbookId && !vesselId) return;
    const activeToken = token || localStorage.getItem('token') || '';
    if (!activeToken) return;
    try {
      setLoading(true);
      const list = await documentsApi.listDocuments(logbookId || vesselId || '', activeToken);
      setDocuments(list);
    } catch (err) {
      console.error('Failed to fetch voyage documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [logbookId, vesselId, token]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const activeToken = token || localStorage.getItem('token') || '';

    const formData = new FormData();
    formData.append('file', file);
    if (logbookId) formData.append('logbook_id', logbookId);
    if (vesselId) formData.append('vessel_id', vesselId);

    try {
      setUploading(true);
      await documentsApi.uploadFile(formData, activeToken);
      await fetchDocs();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(`Chyba při nahrávání souboru: ${err.message || err}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) return;
    const activeToken = token || localStorage.getItem('token') || '';

    try {
      setUploading(true);
      await documentsApi.addPath({
        logbook_id: logbookId,
        vessel_id: vesselId,
        file_path: pathInput.trim(),
      }, activeToken);
      setPathInput('');
      setShowAddPath(false);
      await fetchDocs();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(`Chyba při přidávání složky: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const activeToken = token || localStorage.getItem('token') || '';

    try {
      setUploading(true);
      await documentsApi.addUrl({
        logbook_id: logbookId,
        vessel_id: vesselId,
        url: urlInput.trim(),
      }, activeToken);
      setUrlInput('');
      setShowAddUrl(false);
      await fetchDocs();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(`Chyba při přidávání odkazu: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeDoc = async (docId: string) => {
    const activeToken = token || localStorage.getItem('token') || '';
    try {
      setLoading(true);
      await documentsApi.analyzeDoc(docId, activeToken);
      await fetchDocs();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(`Chyba při AI analýze: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const activeToken = token || localStorage.getItem('token') || '';
    if (!confirm('Opravdu smazat tento podklad k plavbě?')) return;
    try {
      await documentsApi.deleteDoc(docId, activeToken);
      await fetchDocs();
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      alert(`Chyba při mazání: ${err.message || err}`);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            📁 Podklady a dokumenty k plavbě (AI Analýza)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Nahrajte Excel se seznamem posádky, itinerář, složku nebo URL odkaz. AI automaticky prozkoumá podklady a doplní posádku i rozpis hlídek!
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Upload file */}
          <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition shadow flex items-center gap-1.5">
            <span>📤 Nahrát soubor</span>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {/* Add path button */}
          <button
            onClick={() => setShowAddPath(!showAddPath)}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-650 text-slate-200 text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
          >
            <span>📁 Složka na disku</span>
          </button>

          {/* Add URL button */}
          <button
            onClick={() => setShowAddUrl(!showAddUrl)}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-650 text-slate-200 text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
          >
            <span>🌐 Internetový odkaz</span>
          </button>
        </div>
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg p-3 text-blue-300 text-xs flex items-center gap-2 animate-pulse">
          <span>⚡ AI analyzuje nahraný podklad a doplňuje podrobnosti plavby...</span>
        </div>
      )}

      {/* Modal / Form for Local Path */}
      {showAddPath && (
        <form onSubmit={handleAddPath} className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            Cesta ke složce nebo souboru na disku (např. `/home/user/plavba_2026/` nebo `C:\plavba\`):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="/home/user/podklady_plavba/"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition"
            >
              Přidat a AI analyzovat
            </button>
          </div>
        </form>
      )}

      {/* Modal / Form for URL */}
      {showAddUrl && (
        <form onSubmit={handleAddUrl} className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            Internetový odkaz na itinerář / posádku (např. `https://example.com/itinerary`):
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition"
            >
              Přidat a AI analyzovat
            </button>
          </div>
        </form>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-2">
          Zatím nebyly nahrány žádné podklady k této plavbě.
        </p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {doc.doc_type === 'url' ? '🌐' : doc.doc_type === 'folder' ? '📁' : '📄'}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">{doc.title}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {doc.url || doc.file_path || 'Nahraný soubor'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                      doc.ai_status === 'completed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                        : doc.ai_status === 'processing'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800/50 animate-pulse'
                        : doc.ai_status === 'error'
                        ? 'bg-red-950 text-red-300 border border-red-800/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {doc.ai_status === 'completed'
                      ? '✅ AI zanalyzováno'
                      : doc.ai_status === 'processing'
                      ? '⚡ AI analýza...'
                      : doc.ai_status === 'error'
                      ? '❌ Chyba'
                      : '⏳ Čeká'}
                  </span>

                  <button
                    onClick={() => handleAnalyzeDoc(doc.id)}
                    className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 text-xs font-semibold rounded border border-purple-700/40 transition"
                    title="Spustit opětovnou AI analýzu souboru"
                  >
                    🤖 Spustit AI
                  </button>

                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition"
                    title="Smazat podklad"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {doc.ai_summary && (
                <div className="mt-1 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                  {doc.ai_summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
