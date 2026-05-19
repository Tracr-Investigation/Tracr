import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
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
      setError(e instanceof Error ? e.message : 'Adresse introuvable');
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
        setError('Coordonnées invalides');
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
    `flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${
      tab === t
        ? 'border-primary text-primary'
        : 'border-transparent text-secondary hover:text-accent'
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#12122a] border border-primary/30 rounded-xl shadow-2xl overflow-hidden w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-primary/20 bg-primary/10">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20">
            <MapPin size={14} className="text-primary" />
          </div>
          <span className="text-sm text-accent font-semibold flex-1">Insérer une localisation</span>
          <button
            onClick={onClose}
            className="text-secondary hover:text-accent transition-colors p-1 rounded-lg hover:bg-input-bg"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-primary/20 px-4">
          <button className={tabCls('address')} onClick={() => { setTab('address'); setError(''); }}>
            Par adresse
          </button>
          <button className={tabCls('coords')} onClick={() => { setTab('coords'); setError(''); }}>
            Par coordonnées
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
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
                  className="flex-1 bg-[#0f0f1e] border border-primary/20 rounded-lg px-3 py-2 text-sm text-accent placeholder-secondary/50 focus:outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  onClick={handleGeocode}
                  disabled={loading || !address.trim()}
                  className="px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 font-medium"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  Rechercher
                </button>
              </div>

              {result && (
                <div className="rounded-lg bg-primary/10 border border-primary/25 px-3 py-2.5 flex items-start gap-2">
                  <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-accent text-sm font-medium leading-snug">{result.display_name}</p>
                    <p className="text-secondary text-xs mt-1 font-mono">
                      {result.lat.toFixed(5)}°N &nbsp;{result.lng.toFixed(5)}°E
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-secondary mb-1">Latitude</label>
                <input
                  ref={inputRef}
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="48.8566"
                  className="w-full bg-[#0f0f1e] border border-primary/20 rounded-lg px-3 py-2 text-sm text-accent placeholder-secondary/50 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-secondary mb-1">Longitude</label>
                <input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="2.3522"
                  className="w-full bg-[#0f0f1e] border border-primary/20 rounded-lg px-3 py-2 text-sm text-accent placeholder-secondary/50 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-transparent border border-primary/20 text-secondary hover:text-accent hover:border-primary/40 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleInsert}
              disabled={!canInsert}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <MapPin size={13} />
              Insérer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};