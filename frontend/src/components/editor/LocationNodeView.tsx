import 'leaflet/dist/leaflet.css';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { NodeViewWrapper } from '@tiptap/react';
import { Trash2, GripVertical, MapPin, Navigation } from 'lucide-react';

// Fix default marker icons broken by Vite/webpack bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Force Leaflet to recalculate tile layout after mount
const InvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
  }, [map]);
  return null;
};

interface LocationAttrs {
  lat: number;
  lng: number;
  address: string;
}

export const LocationNodeView = ({
  node,
  deleteNode,
}: {
  node: { attrs: LocationAttrs };
  deleteNode: () => void;
}) => {
  const { lat, lng, address } = node.attrs;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  if (!lat || !lng) return null;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const mapsUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`;

  return (
    <NodeViewWrapper className="group relative my-4">
      <div
        data-drag-handle
        contentEditable={false}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-secondary"
      >
        <GripVertical size={14} />
      </div>

      <div
        className="rounded-xl border border-primary/25 overflow-hidden shadow-lg bg-[#12122a]"
        contentEditable={false}
        onContextMenu={handleContextMenu}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/25 shrink-0">
            <MapPin size={12} className="text-primary" />
          </div>
          <p className="text-sm font-medium text-accent truncate flex-1 leading-tight">{address}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors shrink-0 opacity-0 group-hover:opacity-100"
            title="Ouvrir dans OpenStreetMap"
          >
            <Navigation size={11} />
            Voir
          </a>
        </div>

        {/* Map */}
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          style={{ height: '220px', width: '100%' }}
          dragging={false}
          scrollWheelZoom={false}
          zoomControl={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          attributionControl={true}
        >
          <InvalidateSize />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={[lat, lng]} />
        </MapContainer>

        {/* Footer */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#0f0f1e]/60 border-t border-primary/10">
          <span className="text-xs text-secondary font-mono">
            {lat.toFixed(5)}°N
          </span>
          <span className="text-primary/30 text-xs">·</span>
          <span className="text-xs text-secondary font-mono">
            {lng.toFixed(5)}°E
          </span>
        </div>
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-[#12122a] border border-primary/30 rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            onClick={() => { setMenu(null); deleteNode(); }}
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};
