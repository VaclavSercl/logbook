'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { vesselsApi, gpsApi, logbooksApi, entriesApi } from '@/lib/api';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface GpsPoint {
  id: number;
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

interface LogbookEntry {
  id: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  course: number | null;
  speed: number | null;
  wind_direction: number | null;
  wind_speed: number | null;
  pressure: number | null;
  temperature: number | null;
  notes: string | null;
  category: string | null;
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

const parseDateSafely = (dateStr: string) => {
  if (!dateStr) return new Date();
  let formatted = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  if (!formatted.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(formatted)) {
    formatted += 'Z';
  }
  const d = new Date(formatted);
  return isNaN(d.getTime()) ? new Date() : d;
};

export default function MapPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [track, setTrack] = useState<GpsPoint[]>([]);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<'osm' | 'seamap' | 'satellite'>('osm');
  const [showWindy, setShowWindy] = useState(false);

  // Modal form states for manual entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPointLat, setNewPointLat] = useState<number>(43.5081);
  const [newPointLng, setNewPointLng] = useState<number>(16.4402);
  const [newPointSpeed, setNewPointSpeed] = useState<string>('5.0');
  const [newPointCourse, setNewPointCourse] = useState<string>('180');
  const [newPointTime, setNewPointTime] = useState<string>('');

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem('token'));
  }, []);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);

  // 1. Load vessels list
  useEffect(() => {
    if (!mounted || !token) {
      if (mounted) setLoading(false);
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
  const fetchTrack = async (vesselId: string, silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const points = await gpsApi.getTrack(vesselId, token) as GpsPoint[];
      // Sort points chronologically just in case
      const sortedPoints = [...points].sort(
        (a, b) => parseDateSafely(a.timestamp).getTime() - parseDateSafely(b.timestamp).getTime()
      );
      setTrack(sortedPoints);
    } catch (err) {
      console.error('Failed to fetch GPS track:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchEntries = async (vesselId: string) => {
    if (!token) return;
    try {
      const logbooksList = await logbooksApi.list(token, vesselId);
      const activeLogbook = logbooksList.find((l: any) => l.status === 'active');
      if (activeLogbook) {
        const entriesList = await entriesApi.list(activeLogbook.id, token);
        setEntries(entriesList);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to fetch active logbook entries:', err);
    }
  };

  useEffect(() => {
    if (!selectedVesselId) return;
    fetchTrack(selectedVesselId);
    fetchEntries(selectedVesselId);

    // Poll for new live GPS track points and entries every 10 seconds silently
    const interval = setInterval(() => {
      fetchTrack(selectedVesselId, true);
      fetchEntries(selectedVesselId);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedVesselId, token]);

  // Offline entries synchronizer for Map page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncOfflineEntries = async () => {
      const queue = JSON.parse(localStorage.getItem('offline_log_entries') || '[]');
      if (queue.length === 0) return;

      console.log('Online status detected on Map. Syncing offline entries:', queue.length);
      const remainingQueue = [];

      for (const item of queue) {
        try {
          await entriesApi.create(item.logbookId, item.payload, item.token);
        } catch (err) {
          console.error('Failed to sync offline entry on Map:', err);
          remainingQueue.push(item);
        }
      }

      localStorage.setItem('offline_log_entries', JSON.stringify(remainingQueue));
      
      // If we synced successfully, refresh track and entries
      if (remainingQueue.length < queue.length && selectedVesselId) {
        fetchTrack(selectedVesselId, true);
        fetchEntries(selectedVesselId);
      }
    };

    if (navigator.onLine) {
      syncOfflineEntries();
    }

    window.addEventListener('online', syncOfflineEntries);
    return () => window.removeEventListener('online', syncOfflineEntries);
  }, [token, selectedVesselId]);

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
      setNewPointTime(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      setIsModalOpen(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mounted, token]);

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
  }, [layer, track]);

  // 6. Draw HTML markers for logbook entries and wind vectors
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Draw markers for log entries
    entries.forEach((entry) => {
      if (typeof entry.latitude !== 'number' || typeof entry.longitude !== 'number') return;

      // Create a container for our marker
      const el = document.createElement('div');
      el.className = 'group relative flex flex-col items-center justify-center';

      // 1. Wind arrow styling (if wind data exists)
      let windArrowHtml = '';
      if (entry.wind_direction !== null && entry.wind_speed !== null) {
        // Color based on wind speed (knots)
        let color = '#38bdf8'; // light blue (< 10 kn)
        if (entry.wind_speed >= 10 && entry.wind_speed < 18) {
          color = '#22c55e'; // green (10-18 kn)
        } else if (entry.wind_speed >= 18 && entry.wind_speed < 27) {
          color = '#eab308'; // yellow (18-27 kn)
        } else if (entry.wind_speed >= 27) {
          color = '#ef4444'; // red (>= 27 kn)
        }

        // SVG Arrow pointing in the wind direction
        // Note: wind direction degrees indicate where the wind is coming from.
        // So the arrow (representing the air flow) should point to (wind_direction + 180) degrees.
        const rotation = (entry.wind_direction + 180) % 360;

        windArrowHtml = `
          <div style="transform: rotate(${rotation}deg); color: ${color}; font-size: 16px; font-weight: bold; line-height: 1;" class="transition hover:scale-125 cursor-pointer">
            ➔
          </div>
        `;
      }

      // 2. Main Marker Body (anchor or book icon)
      const isIncident = entry.category === 'incident';
      const markerChar = isIncident ? '🚨' : (entry.category === 'anchor' ? '⚓' : '📖');
      const markerBg = isIncident ? 'bg-red-500/20 border-red-500' : 'bg-blue-500/20 border-blue-500';

      el.innerHTML = `
        ${windArrowHtml}
        <div class="w-7 h-7 flex items-center justify-center rounded-full border-2 ${markerBg} backdrop-blur-sm bg-slate-900/80 shadow-lg text-sm transition hover:scale-110 cursor-pointer">
          ${markerChar}
        </div>
      `;

      // 3. Popup on click
      const localTimeStr = new Date(entry.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(entry.timestamp).toLocaleDateString('cs-CZ');
      
      const popupHtml = `
        <div class="bg-slate-900 border border-slate-700 text-slate-100 p-3 rounded-lg text-xs max-w-xs space-y-1.5 shadow-2xl leading-relaxed">
          <div class="flex justify-between items-center border-b border-slate-700 pb-1.5 font-semibold text-slate-300 gap-4">
            <span>${markerChar} Zápis v deníku</span>
            <span>${dateStr} ${localTimeStr}</span>
          </div>
          <p class="font-medium text-slate-200">${entry.notes || 'Bez poznámky.'}</p>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
            <div>💨 Rychlost: ${entry.speed !== null ? `${entry.speed.toFixed(1)} kn` : 'N/A'}</div>
            <div>🧭 Kurz: ${entry.course !== null ? `${entry.course.toFixed(0)}°` : 'N/A'}</div>
            <div>🌬️ Vítr: ${entry.wind_direction !== null ? `${entry.wind_direction.toFixed(0)}°` : 'N/A'} / ${entry.wind_speed !== null ? `${entry.wind_speed.toFixed(0)} kn` : 'N/A'}</div>
            <div>🌡️ Teplota: ${entry.temperature !== null ? `${entry.temperature.toFixed(1)} °C` : 'N/A'}</div>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([entry.longitude, entry.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [entries, layer, track]);

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

    const validPoints = points.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number');
    if (validPoints.length === 0) return;
    const coordinates = validPoints.map(p => [p.longitude, p.latitude]);

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
        ...validPoints.map((p, i) => ({
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
    setNewPointTime(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  const handleGetPhoneGps = () => {
    if (!navigator.geolocation) {
      alert("Tento prohlížeč nebo mobilní zařízení nepodporuje určení polohy pomocí GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewPointLat(parseFloat(position.coords.latitude.toFixed(6)));
        setNewPointLng(parseFloat(position.coords.longitude.toFixed(6)));
        if (position.coords.speed !== null && position.coords.speed !== undefined) {
          // Convert m/s to knots
          const speedKnots = position.coords.speed * 1.94384;
          setNewPointSpeed(speedKnots.toFixed(1));
        }
        if (position.coords.heading !== null && position.coords.heading !== undefined && !isNaN(position.coords.heading)) {
          setNewPointCourse(Math.round(position.coords.heading).toString());
        }
      },
      (error) => {
        let msg = "Nepodařilo se načíst polohu GPS.";
        if (error.code === 1) msg = "Přístup k poloze byl zamítnut. Povolte GPS v nastavení prohlížeče.";
        else if (error.code === 2) msg = "GPS signál není k dispozici.";
        else if (error.code === 3) msg = "Vypršel časový limit pro získání polohy GPS.";
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle addition of new GPS Point to database
  const handleAddPointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!selectedVesselId) {
      alert("Chyba: Před přidáním GPS bodu musíte vybrat nebo vytvořit plavidlo.");
      return;
    }

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

  // Handle deleting a GPS Point
  const handleDeletePoint = async (e: React.MouseEvent, pointId: number) => {
    e.stopPropagation(); // prevent map centering
    if (!token || !selectedVesselId) return;
    if (!confirm("Opravdu chcete tento GPS bod smazat?")) return;

    try {
      await gpsApi.delete(pointId, token);
      await fetchTrack(selectedVesselId);
    } catch (err: any) {
      alert(`Chyba při mazání bodu: ${err.message}`);
    }
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
        <p className="text-slate-400">Pro zobrazení mapy se musíte přihlásit.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col h-screen">
      {/* Header with Navigation */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm font-medium transition flex items-center gap-1.5">
              🏠 Domů
            </Link>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              ⚓ <span className="hidden sm:inline">Logbook</span>
            </h1>
          </div>
          <nav className="flex items-center gap-4 flex-wrap">
            <Link href="/logbook" className="text-slate-300 hover:text-white transition">Deník</Link>
            <Link href="/map" className="text-white font-medium">Mapa</Link>
            <Link href="/weather" className="text-slate-300 hover:text-white transition">Počasí</Link>
            <Link href="/crew" className="text-slate-300 hover:text-white transition">Posádka</Link>
            <Link href="/settings" className="text-slate-300 hover:text-white transition">Nastavení</Link>
            <Link href="/help" className="text-slate-300 hover:text-white transition">Nápověda</Link>
          </nav>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-700/40 pt-3 md:border-t-0 md:pt-0 flex-wrap">
          {/* Vessel Selector / Warnings */}
          {vessels.length === 0 ? (
            <span className="text-xs text-red-400 font-semibold animate-pulse">
              ⚠️ Nemáte žádné plavidlo. Vytvořte ho v sekci 'Plavidla' nebo obnovte stránku.
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Plavidlo:</span>
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
            </div>
          )}
          
          <button
            onClick={handleOpenAddModal}
            disabled={!selectedVesselId}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition shadow-md"
          >
            + Přidat bod
          </button>
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
            <button
              onClick={() => setShowWindy(!showWindy)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                showWindy
                  ? 'bg-orange-600 text-white animate-pulse'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              💨 Windy Radar
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

        {/* Windy Radar side panel */}
        {showWindy && (
          <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col flex-shrink-0 h-full relative z-10">
            <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-850">
              <span className="text-sm font-semibold text-orange-400 flex items-center gap-1.5">
                💨 Windy Radar
              </span>
              <button 
                onClick={() => setShowWindy(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ✕ Zavřít
              </button>
            </div>
            <div className="flex-1 bg-slate-950">
              <iframe 
                src={`https://embed.windy.com/embed2.html?lat=${track[track.length - 1]?.latitude || 43.5081}&lon=${track[track.length - 1]?.longitude || 16.4402}&zoom=6&level=surface&overlay=wind&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=true&metricWind=default&metricTemp=default`}
                width="100%"
                height="100%"
                frameBorder="0"
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        )}

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
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">
                          {parseDateSafely(point.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <button
                          onClick={(e) => handleDeletePoint(e, point.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition"
                          title="Smazat bod"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-100 font-medium font-mono text-xs">
                      <span>{typeof point.latitude === 'number' ? `${point.latitude.toFixed(5)}° N` : '--'}</span>
                      <span>{typeof point.longitude === 'number' ? `${point.longitude.toFixed(5)}° E` : '--'}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-1.5">
                      <span>Rychlost: {typeof point.speed === 'number' ? `${point.speed.toFixed(1)} kn` : '--'}</span>
                      <span>Kurs: {typeof point.course === 'number' ? `${point.course.toFixed(0)}°` : '--'}</span>
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
              <button
                type="button"
                onClick={handleGetPhoneGps}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow"
              >
                📱 Načíst aktuální GPS z telefonu
              </button>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-wide mb-1.5">
                    Zeměpisná šířka (Lat)
                  </label>
                  <input
                    type="number"
                    step="any"
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
                    step="any"
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
