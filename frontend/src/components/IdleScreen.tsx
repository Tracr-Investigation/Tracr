import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const IDLE_DELAY = 10 * 60 * 1000; // 10 min of inactivity before the idle screen
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

export const IdleScreen = () => {
    const { isAuthenticated, user } = useAuth();
    const { i18n } = useTranslation();

    const [idle, setIdle] = useState(false);
    const [exiting, setExiting] = useState(false); // exit animation in progress
    const [now, setNow] = useState(() => new Date());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleRef = useRef(false);

    idleRef.current = idle;

    const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

    // Schedule (or reschedule) the switch to idle.
    const armTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setIdle(true), IDLE_DELAY);
    }, []);

    // On activity: start the exit animation and re-arm the timer.
    useEffect(() => {
        if (!isAuthenticated) return;

        const onActivity = () => {
            if (idleRef.current) setExiting(true);
            armTimer();
        };

        ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
        armTimer();

        return () => {
            ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isAuthenticated, armTimer]);

    // End of the exit animation: actually unmount the screen.
    const handleAnimationEnd = () => {
        if (exiting) {
            setIdle(false);
            setExiting(false);
        }
    };

    // Clock: only ticks while idle.
    useEffect(() => {
        if (!idle) return;
        setNow(new Date());
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, [idle]);

    if (!isAuthenticated || !idle) return null;

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const dateLabel = new Intl.DateTimeFormat(locale, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(now);

    return (
        <div
            onClick={() => setExiting(true)}
            onAnimationEnd={handleAnimationEnd}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-surface)',
                cursor: 'none',
                animation: exiting
                    ? 'idleFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
                    : 'idleFadeIn 0.6s ease both',
                userSelect: 'none',
                overflow: 'hidden',
            }}
        >
            {/* Colored halo */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 55% 45% at 50% 42%, color-mix(in srgb, var(--theme-primary) 14%, transparent), transparent)',
            }} />
            {/* Dot grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3,
                backgroundImage: 'radial-gradient(circle, var(--theme-primary) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black, transparent)',
                WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black, transparent)',
            }} />

            {/* Marque */}
            <div style={{
                position: 'relative', zIndex: 1,
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.4em',
                color: 'var(--theme-primary)', textTransform: 'uppercase', marginBottom: '28px',
            }}>
                Tracr
            </div>

            {/* Horloge */}
            <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'baseline', gap: '4px',
                fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
                fontWeight: 700, color: 'var(--text-default)',
                lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 40px color-mix(in srgb, var(--theme-primary) 30%, transparent)',
            }}>
                <span style={{ fontSize: 'clamp(64px, 16vw, 168px)' }}>{hh}</span>
                <span style={{ fontSize: 'clamp(64px, 16vw, 168px)', animation: 'idleBlink 2s steps(1) infinite' }}>:</span>
                <span style={{ fontSize: 'clamp(64px, 16vw, 168px)' }}>{mm}</span>
                <span style={{ fontSize: 'clamp(28px, 6vw, 64px)', color: 'var(--theme-primary)', marginLeft: '6px' }}>{ss}</span>
            </div>

            {/* Date */}
            <div style={{
                position: 'relative', zIndex: 1, marginTop: '14px',
                fontSize: 'clamp(14px, 2.2vw, 20px)', color: 'var(--text-muted)',
                textTransform: 'capitalize', letterSpacing: '0.04em',
            }}>
                {dateLabel}
            </div>

            {/* Extra info */}
            <div style={{
                position: 'relative', zIndex: 1, marginTop: '40px',
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '10px 20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '999px',
            }}>
                <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#22c55e', boxShadow: '0 0 8px #22c55e',
                    animation: 'idlePulse 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: '13px', color: 'var(--text-default)', fontWeight: 600 }}>
                    {user?.pseudo ?? '-'}
                </span>
                {user?.role && (
                    <span style={{
                        fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.08em', borderLeft: '1px solid var(--border-default)', paddingLeft: '14px',
                    }}>
                        {user.role}
                    </span>
                )}
            </div>

            {/* Resume hint */}
            <div style={{
                position: 'absolute', bottom: '40px', zIndex: 1,
                fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '0.06em',
                animation: 'idlePulse 2.6s ease-in-out infinite',
            }}>
                {locale === 'fr-FR' ? 'Bougez la souris ou appuyez sur une touche pour reprendre' : 'Move the mouse or press a key to resume'}
            </div>

            <style>{`
                @keyframes idleFadeIn {
                    from { opacity: 0; transform: scale(1.015); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes idleFadeOut {
                    from { opacity: 1; transform: scale(1); filter: blur(0); }
                    to   { opacity: 0; transform: scale(1.04); filter: blur(6px); }
                }
                @keyframes idleBlink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.25; } }
                @keyframes idlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
            `}</style>
        </div>
    );
};
