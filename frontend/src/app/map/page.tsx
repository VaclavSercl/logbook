'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { vesselsApi, gpsApi } from '@/lib/api';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface GpsPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  course: number | null;
  timestamp: string;
}

interface Vessel {
  id: string;
  name: string;
  vessel_type?: string | null;
}

// Function to generate the style configuration for MapLibre
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
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, and the GIS User Community'
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

  // Base OpenStreetMap Style
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
      attribution: '&copy; OpenSeaMap contributors'
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

export default function MapPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [track, setTrack] = useState<GpsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<'osm' | 'seamap' | 'satellite'>('osm');

  // Modal form states for manual entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPointLat, setNewPointLat] = useState<number>(43.5081);
  const [newPointLng, setNewPointLng] = useState<number>(16.4402);
  const [newPointSpeed, setNewPointSpeed] = useState<string>('5.0');
  const [newPointCourse, setNewPointCourse] = useState<string>('180');
  const [newPointTime, setNewPointTime] = useState<string>('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);

  // 1. Load vessels list
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchVessels = async () => {
      try {
        const data = await vesselsApi.list(token) as Vessel[];
        setVessels(data);
        if (data.length > 0) {
          setSelectedVesselId(data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch vessels:', err);
        setLoading(false);
      }
    };

    fetchVessels();
  }, [token]);

  // 2. Fetch track for selected vessel
  const fetchTrack = async (vesselId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const points = await gpsApi.getTrack(vesselId, token) as GpsPoint[];
      // Sort points chronologically just in case
      const sortedPoints = [...points].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setTrack(sortedPoints);
    } catch (err) {
      console.error('Failed to fetch GPS track:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVesselId) {
      fetchTrack(selectedVesselId);
    }
  }, [selectedVesselId]);

  // 3. Initialize MapLibre Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Default Split, Croatia coords if no points loaded yet
    const initialCenter: [number, number] = [16.4402, 43.5081];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(layer),
      center: initialCenter,
      zoom: 9,
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.on('load', () => {
      updateMapData(map, track);
    });

    // Add double-click/click listener to easily pick point on map
    map.on('click', (e: any) => {
      const { lng, lat } = e.lngLat;
      setNewPointLat(lat);
      setNewPointLng(lng);
      setNewPointTime(new Date().toISOString().slice(0, 16));
      setIsModalOpen(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 4. Update track line and points when track changes
  useEffect(() => {
    if (mapRef.current) {
      if (mapRef.current.isStyleLoaded()) {
        updateMapData(mapRef.current, track);
      } else {
        const onMapLoad = () => {
          if (mapRef.current) {
            updateMapData(mapRef.current, track);
            mapRef.current.off('load', onMapLoad);
          }
        };
        mapRef.current.on('load', onMapLoad);
      }
    }
  }, [track]);

  // 5. Update map style when layer changes, then restore track
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(getMapStyle(layer));

    const handleStyleLoad = () => {
      if (mapRef.current) {
        updateMapData(mapRef.current, track);
      }
    };

    mapRef.current.on('style.load', handleStyleLoad);
    return () => {
      if (mapRef.current) {
        mapRef.current.off('style.load', handleStyleLoad);
      }
    };
  }, [layer]);

  // Method to redraw the GPS track line and dots
  const updateMapData = (map: any, points: GpsPoint[]) => {
    if (!map || !map.isStyleLoaded()) return;

    // Clean old layers and source if any
    if (map.getLayer('track-line')) map.removeLayer('track-line');
    if (map.getLayer('track-points')) map.removeLayer('track-points');
    if (map.getSource('track')) map.removeSource('track');

    if (points.length === 0) return;

    const coordinates = points.map(p => [p.longitude, p.latitude]);

    const geojson: any = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          },
          properties: {}
        },
        ...points.map((p, i) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [p.longitude, p.latitude]
          },
          properties: {
            index: i + 1,
            speed: p.speed,
            course: p.course,
            timestamp: p.timestamp
          }
        }))
      ]
    };

    map.addSource('track', {
      type: 'geojson',
      data: geojson
    });

    // Draw lines
    map.addLayer({
      id: 'track-line',
      type: 'line',
      source: 'track',
      filter: ['==', '$type', 'LineString'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#2563eb', // blue-600
        'line-width': 4
      }
    });

    // Draw individual points (nodes)
    map.addLayer({
      id: 'track-points',
      type: 'circle',
      source: 'track',
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#ef4444', // red-500
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Automatically zoom/pan to center the track
    if (coordinates.length > 0) {
      const bounds = coordinates.reduce((acc, coord) => {
        return acc.extend(coord as [number, number]);
      }, new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));

      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  };

  // Helper: Haversine distance in NM
  const calculateDistanceNM = (points: GpsPoint[]) => {
    if (points.length < 2) return 0;
    let totalMeters = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      totalMeters += getDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    }
    return totalMeters / 1852; // 1 NM = 1852 meters
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Compute stats
  const speeds = track.map(p => p.speed).filter((s): s is number => s !== null && s !== undefined);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  const distance = calculateDistanceNM(track);

  // Focus the map on a specific point in the sidebar
  const handlePointClick = (point: GpsPoint) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [point.longitude, point.latitude],
        zoom: 14,
        essential: true
      });
    }
  };

  // Open modal pre-filled with appropriate position
  const handleOpenAddModal = () => {
    if (track.length > 0) {
      const last = track[track.length - 1];
      setNewPointLat(last.latitude);
      setNewPointLng(last.longitude);
      setNewPointSpeed(last.speed !== null ? last.speed.toString() : '5.0');
      setNewPointCourse(last.course !== null ? last.course.toString() : '180');
    } else if (mapRef.current) {
      const center = mapRef.current.getCenter();
      setNewPointLat(center.lat);
      setNewPointLng(center.lng);
    }
    setNewPointTime(new Date().toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  // Handle addition of new GPS Point to database
  const handleAddPointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVesselId) return;

    try {
      await gpsApi.add({
        vessel_id: selectedVesselId,
        latitude: newPointLat,
        longitude: newPointLng,
        speed: newPointSpeed ? parseFloat(newPointSpeed) : null,
        course: newPointCourse ? parseFloat(newPointCourse) : null,
        timestamp: new Date(newPointTime).toISOString()
      }, token);

      setIsModalOpen(false);
      await fetchTrack(selectedVesselId);
    } catch (err: any) {
      alert(`Chyba při ukládání bodu: ${err.message}`);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Pro zobrazení mapy se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col h-screen">
      {/* Header with Navigation */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              ⚓ <span className="hidden sm:inline">Logbook</span>
            </h1>
            <nav className="flex items-center gap-4">
              <Link href="/logbook" className="text-slate-300 hover:text-white transition">Deník</Link>
              <Link href="/map" className="text-white font-medium">Mapa</Link>
              <Link href="/weather" className="text-slate-300 hover:text-white transition">Počasí</Link>
              <Link href="/crew" className="text-slate-300 hover:text-white transition">Posádka</Link>
              <Link href="/settings" className="text-slate-300 hover:text-white transition">Nastavení</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Vessel Selector */}
            {vessels.length > 0 && (
              <select
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    🚢 {v.name}
                  </option>
                ))}
              </select>
            )}
            
            <button
              onClick={handleOpenAddModal}
              disabled={!selectedVesselId}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition"
            >
              + Přidat bod
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Map Container Area */}
        <div className="flex-1 relative h-full bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Map Controls overlaid on top right of the map */}
          <div className="absolute top-4 right-4 z-10 flex gap-1 bg-slate-900/80 backdrop-blur border border-slate-700 p-1.5 rounded-lg">
            <button
              onClick={() => setLayer('osm')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                layer === 'osm'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              OSM Style
            </button>
            <button
              onClick={() => setLayer('seamap')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                layer === 'seamap'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              SeaMap Overlay
            </button>
            <button
              onClick={() => setLayer('satellite')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                layer === 'satellite'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Quick Helper Banner */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 shadow-md pointer-events-none hidden sm:block">
            📍 Kliknutím do mapy vyberete souřadnice a přidáte nový GPS bod.
          </div>

          {loading && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-lg text-slate-100 flex items-center gap-3 shadow-xl">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Načítám trasu a GPS body...</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0 h-full">
          {/* Stats Header */}
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
              📈 Statistiky trasy
            </h2>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/60 rounded border border-slate-700/50 p-2.5">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Vzdálenost</p>
                <p className="text-slate-100 text-base font-bold mt-0.5">
                  {distance.toFixed(2)} <span className="text-xs font-normal text-slate-400">NM</span>
                </p>
              </div>
              <div className="bg-slate-900/60 rounded border border-slate-700/50 p-2.5">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Prům. rychlost</p>
                <p className="text-slate-100 text-base font-bold mt-0.5">
                  {avgSpeed.toFixed(1)} <span className="text-xs font-normal text-slate-400">kn</span>
                </p>
              </div>
              <div className="bg-slate-900/60 rounded border border-slate-700/50 p-2.5">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Max. rychlost</p>
                <p className="text-slate-100 text-base font-bold mt-0.5">
                  {maxSpeed.toFixed(1)} <span className="text-xs font-normal text-slate-400">kn</span>
                </p>
              </div>
              <div className="bg-slate-900/60 rounded border border-slate-700/50 p-2.5">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Počet bodů</p>
                <p className="text-slate-100 text-base font-bold mt-0.5">{track.length}</p>
              </div>
            </div>
          </div>

          {/* Track points list */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0">
            <h3 className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">
              Historie GPS Bodů
            </h3>
            
            {track.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <p className="text-sm">Žádné GPS body k zobrazení.</p>
                <p className="text-xs mt-1">Vytvořte nové body ručně nebo kliknutím na mapu.</p>
              </div>
            ) : (
              <div className="space-y-2 min-h-0 flex-1">
                {track.map((point, i) => (
                  <div
                    key={i}
                    onClick={() => handlePointClick(point)}
                    className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-700/30 hover:border-blue-500/50 rounded-lg p-3 text-sm cursor-pointer transition flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-mono text-xs">#{i + 1}</span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(point.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-100 font-medium font-mono text-xs">
                      <span>{point.latitude.toFixed(5)}° N</span>
                      <span>{point.longitude.toFixed(5)}° E</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-1.5">
                      <span>Rychlost: {point.speed !== null ? `${point.speed.toFixed(1)} kn` : '--'}</span>
                      <span>Kurs: {point.course !== null ? `${point.course.toFixed(0)}°` : '--'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual GPS Point Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-750 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-slate-100 font-bold flex items-center gap-2 text-lg">
                📍 Nový GPS bod
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddPointSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wide mb-1.5">
                    Zeměpisná šířka (Lat)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    value={newPointLat}
                    onChange={(e) => setNewPointLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wide mb-1.5">
                    Zeměpisná délka (Lng)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    value={newPointLng}
                    onChange={(e) => setNewPointLng(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wide mb-1.5">
                    Rychlost (SOG kn)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newPointSpeed}
                    onChange={(e) => setNewPointSpeed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wide mb-1.5">
                    Kurs (COG °)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="360"
                    value={newPointCourse}
                    onChange={(e) => setNewPointCourse(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wide mb-1.5">
                  Datum a čas (místní)
                </label>
                <input
                  type="datetime-local"
                  value={newPointTime}
                  onChange={(e) => setNewPointTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-650 text-slate-300 rounded-lg text-sm font-medium transition"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Uložit bod
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
