// Extraction d'indicateurs de compromission (IOC) depuis du texte libre.
// Best-effort par regex : l'utilisateur choisit ensuite ceux à promouvoir
// en entité du graphe. Mappe chaque IOC vers un type d'entité Tracr.

export type IocKind = 'ip' | 'domain' | 'email' | 'hash' | 'cve' | 'crypto';

export interface Ioc {
    value: string;
    kind: IocKind;
    entityType: string; // type d'entité Tracr (voir ENTITY_TYPES)
}

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi;
const MD5 = /\b[a-f0-9]{32}\b/gi;
const SHA1 = /\b[a-f0-9]{40}\b/gi;
const SHA256 = /\b[a-f0-9]{64}\b/gi;
const CVE = /\bCVE-\d{4}-\d{4,7}\b/gi;
const ETH = /\b0x[a-fA-F0-9]{40}\b/g;
const BTC = /\b(?:bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g;

// Extensions de fichier courantes : évite que "rapport.pdf" soit pris pour un domaine.
const FILE_EXT = new Set([
    'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'doc', 'docx',
    'xls', 'xlsx', 'ppt', 'pptx', 'exe', 'dll', 'js', 'ts', 'tsx', 'jsx',
    'html', 'htm', 'css', 'json', 'xml', 'csv', 'zip', 'rar', 'gz', 'tar',
    'mp4', 'mp3', 'mov', 'md',
]);

const KIND_TO_ENTITY: Record<IocKind, string> = {
    ip: 'ip',
    domain: 'domain',
    email: 'email',
    hash: 'other',
    cve: 'other',
    crypto: 'other',
};

export function extractIocs(text: string): Ioc[] {
    const found = new Map<string, Ioc>();
    const add = (kind: IocKind, raw: string) => {
        const value = raw.trim();
        if (!value) return;
        const key = `${kind}:${value.toLowerCase()}`;
        if (!found.has(key)) found.set(key, {value, kind, entityType: KIND_TO_ENTITY[kind]});
    };

    // Emails et URLs sur le texte original.
    for (const m of text.matchAll(EMAIL)) add('email', m[0]);
    for (const m of text.matchAll(URL_RE)) {
        try { add('domain', new URL(m[0]).hostname); } catch { /* url invalide */ }
    }

    // Hashes / CVE / crypto sur le texte original.
    for (const m of text.matchAll(SHA256)) add('hash', m[0]);
    for (const m of text.matchAll(SHA1)) add('hash', m[0]);
    for (const m of text.matchAll(MD5)) add('hash', m[0]);
    for (const m of text.matchAll(CVE)) add('cve', m[0].toUpperCase());
    for (const m of text.matchAll(ETH)) add('crypto', m[0]);
    for (const m of text.matchAll(BTC)) add('crypto', m[0]);

    // IPs puis domaines sur un texte nettoyé des emails/URLs (évite les doublons d'hôtes).
    const work = text.replace(EMAIL, ' ').replace(URL_RE, ' ');
    for (const m of work.matchAll(IPV4)) add('ip', m[0]);

    const noIp = work.replace(IPV4, ' ');
    for (const m of noIp.matchAll(DOMAIN)) {
        const tld = m[0].split('.').pop()?.toLowerCase() ?? '';
        if (FILE_EXT.has(tld)) continue;
        add('domain', m[0]);
    }

    return [...found.values()];
}
