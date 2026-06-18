import { useState, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { useHelpStore } from '../stores/helpStore';

interface HelpTooltipProps {
    helpKey: string;
    children: ReactNode;
    placement?: 'right' | 'bottom' | 'auto';
}

interface HelpEntry {
    title: string;
    description: string;
    steps?: string[];
}

export const HelpTooltip = ({ helpKey, children, placement = 'auto' }: HelpTooltipProps) => {
    const { isHelpMode } = useHelpStore();
    const { t } = useTranslation();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ x: number; y: number; side: 'right' | 'bottom' } | null>(null);
    const [visible, setVisible] = useState(false);
    const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    if (!isHelpMode || !helpKey) return <>{children}</>;

    const entry = t(`help.${helpKey}`, { returnObjects: true }) as HelpEntry | string;
    const content: HelpEntry | null =
        entry && typeof entry === 'object' ? entry : null;

    const open = () => {
        clearTimeout(hideTimer.current);
        showTimer.current = setTimeout(() => {
            const rect = wrapperRef.current?.getBoundingClientRect();
            if (!rect) return;

            const side: 'right' | 'bottom' =
                placement === 'bottom' ? 'bottom' :
                placement === 'right' ? 'right' :
                rect.right + 340 <= window.innerWidth ? 'right' : 'bottom';

            const x = side === 'right'
                ? rect.right + 12
                : rect.left;
            const y = side === 'right'
                ? rect.top + rect.height / 2
                : rect.bottom + 10;

            setCoords({ x, y, side });
            setVisible(true);
        }, 120);
    };

    const close = () => {
        clearTimeout(showTimer.current);
        hideTimer.current = setTimeout(() => {
            setVisible(false);
            setTimeout(() => setCoords(null), 200);
        }, 80);
    };

    return (
        <div
            ref={wrapperRef}
            className="relative"
            onMouseEnter={open}
            onMouseLeave={close}
        >
            {children}

            {/* Badge indicateur */}
            <span className="
                pointer-events-none absolute -top-1.5 -right-1.5 z-[65]
                w-4 h-4 rounded-full flex items-center justify-center
                text-[9px] font-bold text-white
                animate-pulse
            " style={{ background: 'var(--theme-primary)' }}>
                ?
            </span>

            {coords && createPortal(
                <div
                    onMouseEnter={() => clearTimeout(hideTimer.current)}
                    onMouseLeave={close}
                    style={{
                        position: 'fixed',
                        left: coords.x,
                        top: coords.y,
                        transform: coords.side === 'right' ? 'translateY(-50%)' : 'none',
                        zIndex: 70,
                        maxWidth: 300,
                    }}
                    className={`
                        transition-all duration-200 ease-out origin-left
                        ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                    `}
                >
                    <div className="
                        rounded-xl border shadow-2xl p-4 flex flex-col gap-2.5
                    " style={{
                        background: 'color-mix(in srgb, var(--color-card) 88%, transparent)',
                        backdropFilter: 'blur(12px)',
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, var(--border-default))',
                    }}>
                        {/* Header */}
                        <div className="flex items-center gap-2">
                            <HelpCircle size={14} className="shrink-0 text-primary" />
                            <span className="text-xs font-semibold text-text-default">
                                {content?.title ?? helpKey}
                            </span>
                        </div>

                        {/* Description */}
                        {content?.description && (
                            <p className="text-xs text-text-muted leading-relaxed">
                                {content.description}
                            </p>
                        )}

                        {/* Steps */}
                        {content?.steps && content.steps.length > 0 && (
                            <ul className="flex flex-col gap-1.5 mt-0.5">
                                {content.steps.map((step, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-2 text-xs text-text-muted animate-fade-in-up"
                                        style={{ animationDelay: `${i * 60}ms` }}
                                    >
                                        <span
                                            className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white"
                                            style={{ background: 'var(--theme-primary)' }}
                                        >
                                            {i + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
};
