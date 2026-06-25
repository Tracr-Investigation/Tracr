import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {useEffect, useState, useCallback} from 'react';
import {MapContainer, TileLayer, Marker, Popup, useMap} from 'react-leaflet';
import {MapPin, Loader2, RotateCcw, AlertCircle} from 'lucide-react';
import {api} from '../../../services/api';
import {useTranslation} from 'react-i18next';

// Fix marker icons broken by Vite bundling (same fix as LocationNodeView).
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GeoPoint {
    id_entity: number;
    label: string;
    value: string | null;
    lat: number;
    lng: number;
}

interface FailedPoint {
    id_entity: number;
    label: string;
    value: string | null;
}

// Adjusts the map view to fit all the points.
const FitBounds = ({points}: {points: GeoPoint[]}) => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 0);
        if (points.length === 0) return;
        if (points.length === 1) {
            map.setView([points[0].lat, points[0].lng], 13);
            return;
        }
        const bounds = L.latLngBounds(points.map((p: GeoPoint) => [p.lat, p.lng]));
        map.fitBounds(bounds, {padding: [40, 40]});
    }, [points, map]);
    return null;
};

export const MapTab = ({investigationId}: {investigationId: number}) => {
    const {t} = useTranslation();
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState<GeoPoint[]>([]);
    const [failed, setFailed] = useState<FailedPoint[]>([]);
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const {entities} = await api.listEntities(investigationId);
            const locations = entities.filter(e => e.type === 'location');
            setTotal(locations.length);

            const results = await Promise.allSettled(
                locations.map(async (e) => {
                    const address = (e.value?.trim() || e.label?.trim() || '');
                    const geo = await api.geocode(address);
                    return {id_entity: e.id_entity, label: e.label, value: e.value, lat: geo.lat, lng: geo.lng};
                }),
            );

            const ok: GeoPoint[] = [];
            const ko: FailedPoint[] = [];
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') ok.push(r.value);
                else ko.push({id_entity: locations[i].id_entity, label: locations[i].label, value: locations[i].value});
            });
            setPoints(ok);
            setFailed(ko);
        } catch {
            setPoints([]);
            setFailed([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [investigationId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="pt-5 flex items-center justify-center h-[60vh] text-text-dim">
                <Loader2 size={20} className="animate-spin mr-2"/> {t('home.loading')}
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className="pt-5 flex flex-col items-center justify-center h-[60vh] text-center">
                <MapPin size={30} className="text-text-dim mb-3"/>
                <p className="text-text-muted font-medium mb-1">{t('investigationDetail.map.empty')}</p>
                <p className="text-text-dim text-sm">{t('investigationDetail.map.emptyHint')}</p>
            </div>
        );
    }

    return (
        <div className="pt-5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-text-muted">
                    {t('investigationDetail.map.summary', {placed: points.length, total})}
                </p>
                <button
                    onClick={load}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-default bg-input-bg border border-border-subtle hover:border-border-focus transition-all"
                >
                    <RotateCcw size={12}/> {t('investigationDetail.map.refresh')}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 h-[68vh]">
                {/* Carte */}
                <div className="flex-1 rounded-xl overflow-hidden border border-border-subtle min-h-[320px]">
                    <MapContainer
                        center={[20, 0]}
                        zoom={2}
                        style={{height: '100%', width: '100%'}}
                        scrollWheelZoom
                    >
                        <FitBounds points={points}/>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        {points.map((p) => (
                            <Marker key={p.id_entity} position={[p.lat, p.lng]}>
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-semibold">{p.label}</p>
                                        {p.value && p.value !== p.label && (
                                            <p className="text-xs opacity-70">{p.value}</p>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* Side list */}
                <div className="lg:w-72 shrink-0 rounded-xl border border-border-subtle bg-card/30 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-border-subtle">
                        <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            {t('investigationDetail.map.locations')}
                        </h3>
                    </div>
                    <div className="p-2 space-y-0.5">
                        {points.map((p) => (
                            <div key={p.id_entity} className="flex items-start gap-2.5 px-3 py-2 rounded-lg">
                                <MapPin size={14} className="shrink-0 mt-0.5 text-[#84cc16]"/>
                                <div className="min-w-0">
                                    <p className="text-sm text-text-default truncate">{p.label}</p>
                                    <p className="text-[11px] text-text-dim font-mono">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                                </div>
                            </div>
                        ))}
                        {failed.map((f) => (
                            <div key={f.id_entity} className="flex items-start gap-2.5 px-3 py-2 rounded-lg opacity-60" title={t('investigationDetail.map.geocodeFailed')}>
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400"/>
                                <div className="min-w-0">
                                    <p className="text-sm text-text-muted truncate">{f.label}</p>
                                    <p className="text-[11px] text-text-dim">{t('investigationDetail.map.geocodeFailed')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
