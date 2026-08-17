import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Database,
  Cloud,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRightLeft,
  FileCode,
  ShieldCheck
} from 'lucide-react';

export default function SyncStatusModal({ isOpen, onClose }) {
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSyncLogs();
    }
  }, [isOpen]);

  const fetchSyncLogs = async () => {
    try {
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data);
      }
    } catch (e) {
      console.warn('Failed to fetch sync status:', e);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ status: 'success', message: data.message || '雲端與本地同步完成！' });
        fetchSyncLogs();
      } else {
        setSyncResult({ status: 'error', message: data.detail || '同步過程發生錯誤' });
      }
    } catch (e) {
      setSyncResult({ status: 'error', message: e.message || '無法連線至同步服務' });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card max-w-xl w-full p-6 border-slate-200 shadow-xl relative flex flex-col gap-5 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">雲端 ⇄ 本地 PostgreSQL 雙向同步管理</h2>
              <p className="text-xs text-slate-500">確保雲端筆記、畫線與本機資料庫隨時保持一致</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Pipeline Visual */}
        <div className="grid grid-cols-3 items-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
              <Cloud className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">雲端 PostgreSQL</span>
            <span className="text-[10px] text-slate-500 font-mono">Supabase / Neon</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ArrowRightLeft className="w-6 h-6 text-blue-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-mono">時間戳差量同步</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700">本地端資料庫</span>
            <span className="text-[10px] text-slate-500 font-mono">Postgres / SQLite</span>
          </div>
        </div>

        {/* Action Button & Status Alert */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">手動觸發同步：</span>
            <button
              onClick={handleTriggerSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? '同步進行中...' : '立即執行雙向同步'}</span>
            </button>
          </div>

          {syncResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                syncResult.status === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {syncResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>

        {/* Sync Logs */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-600">最近同步記錄 (Sync History)：</span>
          <div className="max-h-36 overflow-y-auto rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-xs font-mono">
            {syncLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-2">尚無同步記錄（可點擊上方執行同步）</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {syncLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center text-slate-600 border-b border-slate-200 pb-1">
                    <span className="text-blue-600">{log.created_at?.slice(0, 19).replace('T', ' ')}</span>
                    <span className="text-slate-600">{log.details || `筆記: ${log.synced_notes_count}, 畫線: ${log.synced_drawings_count}`}</span>
                    <span className="text-emerald-600 font-bold">{log.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footnote */}
        <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3 flex items-start gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span>
            提示：在雲端部署（如 Vercel + Supabase）後，您只需在本機執行 <code className="text-blue-600 bg-blue-50 px-1 rounded">python backend/scripts/sync_db.py</code> 或設置排程，即可在背景自動將線上共同編輯的筆記拉回本地端。
          </span>
        </div>
      </div>
    </div>
  );
}
