'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { publicApi } from '@/lib/api';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface GpsPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  course: number | null;
  timestamp: string;
}

interface Logbook {
  id: string;
  vessel_id: string;
  vessel_name: string;
  title: string;
  voyage_from?: string;
  voyage_to?: string;
  status: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  course?: number | null;
  speed?: number | null;
  wind_direction?: number | null;
  wind_speed?: number | null;
  pressure?: number | null;
  notes?: string | null;
  category?: string | null;
}

const getMapStyle = (layerType: 'osm' | 'seamap' | 'satellite') => {
  if (layerType === 'satellite') {
    return {
      version: 8 as const,
      sources: {
        'satellite': {
          type: 'raster' as const,
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri'
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster' as const,
          source: 'satellite',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };
  }

  const style: any = {
    version: 8,
    sources: {
      'osm': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  };

  if (layerType === 'seamap') {
    style.sources['openseamap'] = {
      type: 'raster',
      tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenSeaMap'
    };
    style.layers.push({
      id: 'openseamap',
      type: 'raster',
      source: 'openseamap',
      minzoom: 0,
      maxzoom: 19
    });
  }

  return style;
};

const parseDateSafely = (dateStr: string) => {
  if (!dateStr) return new Date();
  let formatted = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  if (!formatted.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(formatted)) {
    formatted += 'Z';
  }
  const d = new Date(formatted);
  return isNaN(d.getTime()) ? new Date() : d;
};

export default function PublicLogbookViewPage() {
  const params = useParams();
  const logbookId = params.id as string;

  const [logbook, setLogbook] = useState<Logbook | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [track, setTrack] = useState<GpsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<'osm' | 'seamap' | 'satellite'>('seamap');
  const [mounted, setMounted] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Logbook details and entries
  useEffect(() => {
    if (!mounted || !logbookId) return;

    async function loadData() {
      try {
        setLoading(true);
        const logData = await publicApi.getLogbook(logbookId);
        setLogbook(logData);
        
        const entriesData = await publicApi.listEntries(logbookId);
        setEntries(entriesData);
        
        // Fetch track for the vessel
        const gpsData = await publicApi.getGpsTrack(logData.vessel_id);
        const sortedGps = [...gpsData].sort(
          (a, b) => parseDateSafely(a.timestamp).getTime() - parseDateSafely(b.timestamp).getTime()
        );
        setTrack(sortedGps);
      } catch (err) {
        console.error('Failed to load public logbook:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [mounted, logbookId]);

  // 2. Map rendering hook
  useEffect(() => {
    if (!mounted || !mapContainerRef.current || !logbook) return;

    const initialCenter: [number, number] = track.length > 0 
      ? [track[track.length - 1].longitude, track[track.length - 1].latitude]
      : [16.4402, 43.5081];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(layer),
      center: initialCenter,
      zoom: track.length > 0 ? 12 : 9,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.on('load', () => {
      // Draw GPS track
      if (track.length > 0) {
        const coordinates = track.map(p => [p.longitude, p.latitude]);

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#7170ff',
            'line-width': 4
          }
        });

        // Add start and end markers
        new maplibregl.Marker({ color: '#10b981' })
          .setLngLat(coordinates[0] as [number, number])
          .addTo(map);

        new maplibregl.Marker({ color: '#ef4444' })
          .setLngLat(coordinates[coordinates.length - 1] as [number, number])
          .addTo(map);

        // Fit map bounds to track
        const bounds = coordinates.reduce((acc, coord) => {
          return acc.extend(coord as [number, number]);
        }, new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));

        map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    });

    return () => {
      map.remove();
    };
  }, [mounted, logbook, track, layer]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#08090a]" />;
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] font-sans flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-[#0f1011] border-b border-white/[0.05] px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 rounded-lg text-xs font-semibold tracking-tight transition flex items-center gap-1.5 shadow-lg shadow-black/20">
            🏠 Domů
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 font-bold uppercase tracking-wider bg-red-950/40 border border-red-800/30 px-2 py-0.5 rounded-full animate-pulse">Live</span>
            <h1 className="text-sm font-semibold tracking-tight text-[#f7f8f8]">
              {logbook ? `${logbook.title} (Loď: ${logbook.vessel_name})` : 'Načítám...'}
            </h1>
          </div>
        </div>
        <div className="text-[11px] text-[#8a8f98] font-medium hidden sm:block">
          Veřejná sledovací trasa
        </div>
      </header>

      {/* Main split view */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Map Container */}
        <div className="flex-1 md:w-3/5 h-1/2 md:h-full relative border-b md:border-b-0 md:border-r border-white/[0.05]">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Layer switcher */}
          <div className="absolute bottom-6 left-6 z-10 bg-[#0f1011]/90 border border-white/[0.08] rounded-lg p-1 flex gap-1 shadow-2xl backdrop-blur-sm">
            <button
              onClick={() => setLayer('osm')}
              className={`px-3 py-1 rounded text-[10px] font-medium transition ${
                layer === 'osm' ? 'bg-[#5e6ad2] text-white' : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              OSM Map
            </button>
            <button
              onClick={() => setLayer('seamap')}
              className={`px-3 py-1 rounded text-[10px] font-medium transition ${
                layer === 'seamap' ? 'bg-[#5e6ad2] text-white' : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              Nautical
            </button>
            <button
              onClick={() => setLayer('satellite')}
              className={`px-3 py-1 rounded text-[10px] font-medium transition ${
                layer === 'satellite' ? 'bg-[#5e6ad2] text-white' : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Right Side: Logbook Timeline */}
        <div className="md:w-2/5 h-1/2 md:h-full overflow-y-auto bg-[#08090a]/70 backdrop-blur-lg flex flex-col">
          <div className="p-6 border-b border-white/[0.05] flex justify-between items-center bg-[#0f1011]/20">
            <h3 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Chronologické záznamy plavby</h3>
            <span className="text-[10px] font-mono-custom text-slate-500">Celkem {entries.length} bodů</span>
          </div>

          <div className="flex-1 p-6 space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-xs text-slate-500 mt-3 uppercase tracking-wider font-medium">Načítám data...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 bg-[#0f1011]/40 border border-white/[0.03] rounded-xl p-8">
                <span className="text-3xl mb-2 block">📝</span>
                <p className="text-sm font-semibold text-slate-300">Žádné veřejné záznamy</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">V tomto deníku zatím nejsou žádné záznamy kapitána o plavbě.</p>
              </div>
            ) : (
              <div className="relative border-l border-white/[0.05] pl-6 ml-3 space-y-8">
                {entries.map((entry) => (
                  <div key={entry.id} className="relative group">
                    {/* Pulsating timeline node */}
                    <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-white/[0.1] group-hover:border-[#7170ff]/80 transition">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500 group-hover:bg-[#7170ff] transition" />
                    </span>

                    <div className="bg-[#0f1011] border border-white/[0.05] rounded-xl p-4 shadow-sm hover:border-[#5e6ad2]/20 transition">
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-1.5">
                        <span className="text-[10px] font-mono-custom text-[#7170ff] font-medium">
                          {new Date(entry.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} UTC
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(entry.timestamp).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                      
                      {entry.notes && (
                        <p className="text-xs text-[#d0d6e0] leading-relaxed mb-3">{entry.notes}</p>
                      )}

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-white/[0.01] border border-white/[0.03] p-2 rounded">
                        <div>📍 Pozice: <span className="text-slate-300 font-mono-custom">{entry.latitude.toFixed(4)}°N, {entry.longitude.toFixed(4)}°E</span></div>
                        {entry.speed !== null && (
                          <div>🚀 Rychlost: <span className="text-slate-300 font-mono-custom">{entry.speed} kn</span></div>
                        )}
                        {entry.course !== null && (
                          <div>🧭 Kurz: <span className="text-slate-300 font-mono-custom">{entry.course}°</span></div>
                        )}
                        {entry.pressure !== null && (
                          <div>📊 Tlak: <span className="text-slate-300 font-mono-custom">{entry.pressure} hPa</span></div>
                        )}
                        {entry.wind_speed !== null && (
                          <div>💨 Vítr: <span className="text-slate-300 font-mono-custom">{entry.wind_speed} kn {entry.wind_direction ? `(${entry.wind_direction}°)` : ''}</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
