import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { NodeViewWrapper } from '@tiptap/react';
import { Trash2, GripVertical } from 'lucide-react';

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

  return (
    <NodeViewWrapper className="group relative">
      <div
        data-drag-handle
        contentEditable={false}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-secondary"
      >
        <GripVertical size={14} />
      </div>
      <div
        className="my-3 rounded-lg border border-primary/20"
        contentEditable={false}
        onContextMenu={handleContextMenu}
      >
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          style={{ height: '200px', width: '100%', borderRadius: '0.5rem 0.5rem 0 0' }}
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
        <div className="px-3 py-2 bg-[#1a1a2e] text-sm rounded-b-lg">
          <p className="text-accent font-medium">📍 {address}</p>
          <p className="text-secondary text-xs mt-0.5">{lat.toFixed(5)}° N, {lng.toFixed(5)}° E</p>
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
