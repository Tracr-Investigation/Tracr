import {ExternalLink} from 'lucide-react';
import {useTranslation} from 'react-i18next';

// OSINT enrichment pivots: deep-links to public tools, tailored to the entity
// type. No network call on Tracr's side - just links opened in a new tab.

interface Pivot {
    label: string;
    build: (q: string) => string;
}

const enc = encodeURIComponent;
const stripAt = (q: string) => q.replace(/^@+/, '');

const GENERIC: Pivot[] = [
    {label: 'Google', build: q => `https://www.google.com/search?q=${enc(q)}`},
    {label: 'DuckDuckGo', build: q => `https://duckduckgo.com/?q=${enc(q)}`},
    {label: 'Wayback', build: q => `https://web.archive.org/web/*/${enc(q)}`},
];

const PIVOTS: Record<string, Pivot[]> = {
    domain: [
        {label: 'VirusTotal', build: q => `https://www.virustotal.com/gui/domain/${enc(q)}`},
        {label: 'urlscan.io', build: q => `https://urlscan.io/search/#${enc(q)}`},
        {label: 'crt.sh', build: q => `https://crt.sh/?q=${enc(q)}`},
        {label: 'SecurityTrails', build: q => `https://securitytrails.com/domain/${enc(q)}/dns`},
        {label: 'Whois', build: q => `https://who.is/whois/${enc(q)}`},
    ],
    ip: [
        {label: 'Shodan', build: q => `https://www.shodan.io/host/${enc(q)}`},
        {label: 'VirusTotal', build: q => `https://www.virustotal.com/gui/ip-address/${enc(q)}`},
        {label: 'AbuseIPDB', build: q => `https://www.abuseipdb.com/check/${enc(q)}`},
        {label: 'Censys', build: q => `https://search.censys.io/hosts/${enc(q)}`},
        {label: 'GreyNoise', build: q => `https://viz.greynoise.io/ip/${enc(q)}`},
    ],
    email: [
        {label: 'Epieos', build: q => `https://epieos.com/?q=${enc(q)}&t=email`},
        {label: 'EmailRep', build: q => `https://emailrep.io/${enc(q)}`},
        {label: 'Have I Been Pwned', build: () => `https://haveibeenpwned.com/`},
        {label: 'Hunter', build: q => `https://hunter.io/email-verifier/${enc(q)}`},
    ],
    account: [
        {label: 'X / Twitter', build: q => `https://x.com/${enc(stripAt(q))}`},
        {label: 'Instagram', build: q => `https://www.instagram.com/${enc(stripAt(q))}`},
        {label: 'GitHub', build: q => `https://github.com/${enc(stripAt(q))}`},
        {label: 'Reddit', build: q => `https://www.reddit.com/user/${enc(stripAt(q))}`},
        {label: 'TikTok', build: q => `https://www.tiktok.com/@${enc(stripAt(q))}`},
        {label: 'WhatsMyName', build: () => `https://whatsmyname.app/`},
    ],
    phone: [
        {label: 'Google dork', build: q => `https://www.google.com/search?q=${enc(`"${q}"`)}`},
        {label: 'Sync.me', build: q => `https://sync.me/search/?number=${enc(q)}`},
    ],
    person: [
        {label: 'LinkedIn', build: q => `https://www.linkedin.com/search/results/all/?keywords=${enc(q)}`},
        {label: 'Google dork', build: q => `https://www.google.com/search?q=${enc(`"${q}"`)}`},
    ],
    organization: [
        {label: 'LinkedIn', build: q => `https://www.linkedin.com/search/results/companies/?keywords=${enc(q)}`},
        {label: 'OpenCorporates', build: q => `https://opencorporates.com/companies?q=${enc(q)}`},
    ],
    location: [
        {label: 'Google Maps', build: q => `https://www.google.com/maps/search/?api=1&query=${enc(q)}`},
        {label: 'OpenStreetMap', build: q => `https://www.openstreetmap.org/search?query=${enc(q)}`},
    ],
    other: [
        {label: 'VirusTotal', build: q => `https://www.virustotal.com/gui/search/${enc(q)}`},
    ],
};

export const EnrichmentPivots = ({type, value, label}: {
    type: string;
    value: string | null;
    label: string;
}) => {
    const {t} = useTranslation();
    const q = (value?.trim() || label?.trim() || '');

    if (!q) {
        return <p className="text-xs text-text-dim">{t('osint.pivotsHint')}</p>;
    }

    const links = [...(PIVOTS[type] ?? []), ...GENERIC];

    return (
        <div className="flex flex-wrap gap-1.5">
            {links.map(p => (
                <a
                    key={p.label}
                    href={p.build(q)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-input-bg border border-border-subtle text-xs text-text-muted hover:text-text-default hover:border-border-focus transition-all"
                >
                    <ExternalLink size={11}/>
                    {p.label}
                </a>
            ))}
        </div>
    );
};
