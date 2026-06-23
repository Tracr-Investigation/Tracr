import { useState, useEffect, useCallback, useRef } from 'react';
import { api, type UpdateStatusData, type UpdateApplyState } from '../../../services/api';
import { SidePanel } from '../../../components/SidePanel';
import {
  RefreshCw, GitCommit, CheckCircle2, AlertTriangle, ArrowDownToLine,
  Database, Package, Box, ExternalLink, HelpCircle, Loader2, XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FlagBadge = ({ icon: Icon, label }: { icon: typeof Database; label: string }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
    <Icon size={13} />
    {label}
  </span>
);

const ApplyBanner = ({ apply }: { apply: UpdateApplyState }) => {
  const { t } = useTranslation();
  if (apply.status === 'idle') return null;

  // Un résultat terminal (done/failed) est conservé côté agent ; on ne l'affiche
  // que s'il est récent (< 15 min) pour ne pas montrer un vieux message au chargement.
  if (apply.status === 'done' || apply.status === 'failed') {
    const ts = apply.finished_at ? new Date(apply.finished_at).getTime() : 0;
    if (!ts || Date.now() - ts > 15 * 60 * 1000) return null;
  }

  const config = {
    pending: { icon: Loader2, spin: true, cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    running: { icon: Loader2, spin: true, cls: 'bg-primary/10 border-primary/30 text-primary' },
    done: { icon: CheckCircle2, spin: false, cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    failed: { icon: XCircle, spin: false, cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
  }[apply.status];

  const Icon = config.icon;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border mb-6 ${config.cls}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${config.spin ? 'animate-spin' : ''}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{t(`admin.updates.apply.${apply.status}`)}</p>
        {apply.message && <p className="text-xs opacity-80 mt-0.5">{apply.message}</p>}
        {apply.target_sha && (
          <p className="text-xs opacity-70 mt-0.5 font-mono">→ {apply.target_sha}</p>
        )}
      </div>
    </div>
  );
};

const ConfirmPanel = ({ open, data, onClose, onConfirm }: {
  open: boolean; data: UpdateStatusData; onClose: () => void; onConfirm: () => void;
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Réinitialise l'état du bouton à chaque ouverture.
  useEffect(() => { if (open) setLoading(false); }, [open]);

  const confirm = async () => {
    setLoading(true);
    try { await onConfirm(); } catch { setLoading(false); }
  };

  return (
    <SidePanel open={open} onClose={onClose} title={t('admin.updates.confirmTitle')}>
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <div className="px-6 py-5 space-y-4 flex-1">
          <p className="text-text-muted text-sm">
            {t('admin.updates.confirmBody', { count: data.ahead_by ?? 0, sha: data.latest_sha ?? '' })}
          </p>

          {(data.flags.migrations || data.flags.deps || data.flags.rebuild) && (
            <div className="flex flex-wrap gap-2">
              {data.flags.migrations && <FlagBadge icon={Database} label={t('admin.updates.flagMigrations')} />}
              {data.flags.deps && <FlagBadge icon={Package} label={t('admin.updates.flagDeps')} />}
              {data.flags.rebuild && <FlagBadge icon={Box} label={t('admin.updates.flagRebuild')} />}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-text-muted text-xs">{t('admin.updates.confirmWarning')}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-subtle shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/10 hover:text-text-default disabled:opacity-40 transition-all">
            {t('admin.updates.cancel')}
          </button>
          <button type="button" onClick={confirm} disabled={loading} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 disabled:opacity-40 transition-all">
            {loading ? t('admin.updates.applying') : t('admin.updates.confirmApply')}
          </button>
        </div>
      </div>
    </SidePanel>
  );
};

export const UpdatesTab = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<UpdateStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      setData(await api.getUpdateStatus(force));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Tant qu'une application est en attente / en cours, on rafraîchit l'état régulièrement.
  const applyStatus = data?.apply.status;
  useEffect(() => {
    const active = applyStatus === 'pending' || applyStatus === 'running';
    if (active && !pollRef.current) {
      pollRef.current = setInterval(() => {
        api.getUpdateStatus().then(setData).catch(() => {});
      }, 5000);
    }
    if (!active && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [applyStatus]);

  const handleApply = async () => {
    try {
      const apply = await api.applyUpdate();
      setData((prev) => (prev ? { ...prev, apply } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setConfirmOpen(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderHeadline = () => {
    if (!data) return null;

    if (data.error === 'rate_limited' || data.error === 'github_unreachable') {
      return (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center">
            <AlertTriangle size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">{t('admin.updates.errorLabel')}</p>
            <p className="text-white text-lg font-bold">{t(`admin.updates.errors.${data.error}`)}</p>
          </div>
        </div>
      );
    }

    if (!data.known) {
      return (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center">
            <HelpCircle size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">{t('admin.updates.unknownLabel')}</p>
            <p className="text-white text-lg font-bold">{t('admin.updates.unknownTitle')}</p>
          </div>
        </div>
      );
    }

    if (data.up_to_date) {
      return (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center">
            <CheckCircle2 size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">{t('admin.updates.statusLabel')}</p>
            <p className="text-white text-2xl font-bold">{t('admin.updates.upToDate')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/15 rounded-lg flex items-center justify-center">
          <ArrowDownToLine size={24} className="text-white" />
        </div>
        <div>
          <p className="text-white/70 text-sm">{t('admin.updates.statusLabel')}</p>
          <p className="text-white text-2xl font-bold">
            {t('admin.updates.behindBy', { count: data.ahead_by ?? 0 })}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="px-6 py-12 text-center text-text-muted">{t('admin.updates.loading')}</div>;
  }

  const applyInProgress = applyStatus === 'pending' || applyStatus === 'running';
  // Un changement de dépendances ou d'infra impose une reconstruction d'image,
  // que l'agent (restart seul) ne peut pas faire : il faut un rebuild manuel sur l'hôte.
  const needsRebuild = !!data && (data.flags.rebuild || data.flags.deps);
  const canApply = !!data && data.known && !data.up_to_date && !applyInProgress && !needsRebuild;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 inline-flex">
          {renderHeadline()}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-card/30 border border-border-subtle text-text-muted hover:bg-primary/10 hover:text-text-default disabled:opacity-40 transition-all"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {t('admin.updates.refresh')}
          </button>

          {canApply && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-text-default border border-primary/30 hover:bg-primary/30 transition-all"
            >
              <ArrowDownToLine size={16} />
              {t('admin.updates.applyButton')}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      {data && data.known && !data.up_to_date && needsRebuild && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 mb-6">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-400">{t('admin.updates.rebuildRequiredTitle')}</p>
            <p className="text-text-muted text-xs mt-1">{t('admin.updates.rebuildRequiredBody')}</p>
            <code className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-input-bg border border-border text-text-default font-mono text-xs">
              git pull &amp;&amp; docker compose up -d --build
            </code>
          </div>
        </div>
      )}

      {data && (
        <>
          <ApplyBanner apply={data.apply} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card/30 border border-border-subtle rounded-xl p-4">
              <p className="text-text-muted text-xs mb-1">{t('admin.updates.currentSha')}</p>
              <p className="text-text-default font-mono text-sm">{data.current_sha ?? '-'}</p>
            </div>
            <div className="bg-card/30 border border-border-subtle rounded-xl p-4">
              <p className="text-text-muted text-xs mb-1">{t('admin.updates.latestSha')} ({data.branch})</p>
              <p className="text-text-default font-mono text-sm">{data.latest_sha ?? '-'}</p>
            </div>
            <div className="bg-card/30 border border-border-subtle rounded-xl p-4">
              <p className="text-text-muted text-xs mb-1">{t('admin.updates.checkedAt')}</p>
              <p className="text-text-default text-sm">{formatDate(data.checked_at)}</p>
            </div>
          </div>

          {data.known && !data.up_to_date && (data.flags.migrations || data.flags.deps || data.flags.rebuild) && (
            <div className="mb-6">
              <p className="text-text-muted text-sm mb-2">{t('admin.updates.impactLabel')}</p>
              <div className="flex flex-wrap gap-2">
                {data.flags.migrations && <FlagBadge icon={Database} label={t('admin.updates.flagMigrations')} />}
                {data.flags.deps && <FlagBadge icon={Package} label={t('admin.updates.flagDeps')} />}
                {data.flags.rebuild && <FlagBadge icon={Box} label={t('admin.updates.flagRebuild')} />}
              </div>
            </div>
          )}

          {data.compare_url && (
            <a
              href={data.compare_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6"
            >
              <ExternalLink size={14} />
              {t('admin.updates.viewOnGithub')}
            </a>
          )}

          <div className="bg-card/30 border border-border-subtle rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <GitCommit size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-default">{t('admin.updates.commitsTitle')}</span>
            </div>
            {data.commits.length === 0 ? (
              <div className="px-6 py-12 text-center text-text-muted">{t('admin.updates.noCommits')}</div>
            ) : (
              <ul>
                {data.commits.map((c) => (
                  <li key={c.sha} className="px-6 py-3 border-b border-border-subtle last:border-0 hover:bg-card/20 transition-colors flex items-start gap-4">
                    <a
                      href={c.url ?? '#'} target="_blank" rel="noopener noreferrer"
                      className="text-primary font-mono text-xs mt-0.5 hover:underline shrink-0"
                    >
                      {c.sha}
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="text-text-default text-sm truncate">{c.message}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {c.author ?? '-'} · {formatDate(c.date)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {data && (
        <ConfirmPanel open={confirmOpen} data={data} onClose={() => setConfirmOpen(false)} onConfirm={handleApply} />
      )}
    </div>
  );
};
