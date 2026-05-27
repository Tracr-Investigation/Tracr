import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
import { api } from '../../services/api';

type Tab = 'address' | 'coords';

interface Props {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}

export const LocationModal = ({ editor, open, onClose }: Props) => {
  const [tab, setTab] = useState<Tab>('address');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [result, setResult] = useState<{ lat: number; lng: number; display_name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTab('address');
      setAddress('');
      setLat('');
      setLng('');
      setResult(null);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

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
    `flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
      tab === t
        ? 'border-primary text-primary'
        : 'border-transparent text-text-muted hover:text-text-default'
    }`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[45] lg:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-[440px] z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--color-card)', borderLeft: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}
            >
              <MapPin size={14} className="text-primary" />
            </div>
            <h2 className="text-base font-bold text-text-default">Insérer une localisation</h2>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-default transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle px-6 shrink-0">
          <button className={tabCls('address')} onClick={() => { setTab('address'); setError(''); }}>
            Par adresse
          </button>
          <button className={tabCls('coords')} onClick={() => { setTab('coords'); setError(''); }}>
            Par coordonnées
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {tab === 'address' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                  Adresse
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
                    placeholder="ex: 12 rue de la Paix, Paris"
                    className="flex-1 bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                  />
                  <button
                    onClick={handleGeocode}
                    disabled={loading || !address.trim()}
                    className="px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                    style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', color: 'var(--theme-primary)' }}
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    Rechercher
                  </button>
                </div>
              </div>

              {result && (
                <div
                  className="rounded-xl px-4 py-3 flex items-start gap-2.5 border"
                  style={{
                    background: 'color-mix(in srgb, var(--theme-primary) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)',
                  }}
                >
                  <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-text-default text-sm font-medium leading-snug">{result.display_name}</p>
                    <p className="text-text-muted text-xs mt-1 font-mono">
                      {result.lat.toFixed(5)}°N &nbsp;{result.lng.toFixed(5)}°E
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                  Latitude
                </label>
                <input
                  ref={inputRef}
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="48.8566"
                  className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-default/50 uppercase tracking-wider mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="2.3522"
                  className="w-full bg-input-bg border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-default placeholder-text-dim focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
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
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-border-subtle shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-input-bg border border-border-subtle text-text-muted hover:text-text-default transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleInsert}
            disabled={!canInsert}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
            style={{ background: 'var(--theme-primary)' }}
          >
            <MapPin size={13} />
            Insérer
          </button>
        </div>
      </div>
    </>
  );
};
