import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

type Tab = 'address' | 'coords';

interface Props {
  editor: Editor;
  onClose: () => void;
}

export const LocationModal = ({ editor, onClose }: Props) => {
  const [tab, setTab] = useState<Tab>('address');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [result, setResult] = useState<{ lat: number; lng: number; display_name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.geocode(address.trim());
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Address not found');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    let finalLat: number, finalLng: number, finalAddress: string;

    if (tab === 'address' && result) {
      finalLat = result.lat;
      finalLng = result.lng;
      finalAddress = result.display_name;
    } else if (tab === 'coords') {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        setError('Invalid coordinates');
        return;
      }
      finalLat = parsedLat;
      finalLng = parsedLng;
      finalAddress = `${parsedLat.toFixed(5)}° N, ${parsedLng.toFixed(5)}° E`;
    } else {
      return;
    }

    editor.commands.insertLocation({ lat: finalLat, lng: finalLng, address: finalAddress });
    onClose();
  };

  const canInsert =
    (tab === 'address' && result !== null) ||
    (tab === 'coords' && lat.trim() !== '' && lng.trim() !== '');

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm transition-colors rounded-t ${
      tab === t
        ? 'bg-primary/20 text-primary border-b-2 border-primary'
        : 'text-secondary hover:text-accent'
    }`;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 mx-2">
      <div className="bg-[#12122a] border border-primary/30 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-3 pb-0 border-b border-primary/20">
          <MapPin size={14} className="text-primary" />
          <span className="text-sm text-accent font-medium flex-1">Insérer une localisation</span>
          <button
            onClick={onClose}
            className="text-secondary hover:text-accent text-lg leading-none pb-1"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 px-3 pt-2">
          <button className={tabCls('address')} onClick={() => { setTab('address'); setError(''); }}>
            Adresse
          </button>
          <button className={tabCls('coords')} onClick={() => { setTab('coords'); setError(''); }}>
            Coordonnées
          </button>
        </div>

        <div className="p-3 space-y-2">
          {tab === 'address' ? (
            <>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
                  placeholder="ex: 12 rue de la Paix, Paris"
                  className="flex-1 bg-dark border border-primary/20 rounded px-3 py-1.5 text-sm text-accent placeholder-secondary focus:outline-none focus:border-primary/60"
                />
                <button
                  onClick={handleGeocode}
                  disabled={loading || !address.trim()}
                  className="px-3 py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  Rechercher
                </button>
              </div>

              {result && (
                <div className="rounded bg-primary/10 border border-primary/20 px-3 py-2 text-sm">
                  <p className="text-accent">📍 {result.display_name}</p>
                  <p className="text-secondary text-xs mt-0.5">
                    {result.lat.toFixed(5)}° N, {result.lng.toFixed(5)}° E
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="number"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude (ex: 48.8566)"
                className="flex-1 bg-dark border border-primary/20 rounded px-3 py-1.5 text-sm text-accent placeholder-secondary focus:outline-none focus:border-primary/60"
              />
              <input
                type="number"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude (ex: 2.3522)"
                className="flex-1 bg-dark border border-primary/20 rounded px-3 py-1.5 text-sm text-accent placeholder-secondary focus:outline-none focus:border-primary/60"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-dark border border-primary/20 text-secondary hover:text-accent transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleInsert}
              disabled={!canInsert}
              className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Insérer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
