import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  scanOrphanedDocuments,
  deleteOrphanedDocuments,
} from "../../services/orphanCleanupService";

const COLLECTION_LABELS = {
  meals: "Meals",
  guestMeals: "Guest Meals",
  deposits: "Deposits",
  mealSettings: "Meal Settings",
  autoMealSkips: "Auto Meal Skips",
};

export function OrphanCleanupPanel({ ownerId }) {
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleScan = async () => {
    if (!ownerId) {
      toast.error("Workspace not identified.");
      return;
    }

    setScanning(true);
    setError("");
    setReport(null);
    setResult(null);

    try {
      const scanReport = await scanOrphanedDocuments(ownerId);
      setReport(scanReport);

      if (scanReport.totalOrphans === 0) {
        toast.success("No orphaned records found. Database is clean.");
      }
    } catch (err) {
      console.error("Orphan scan failed:", err);
      setError(err.message || "Scan failed. Please try again.");
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async () => {
    if (!ownerId || !report) return;

    setDeleting(true);
    setError("");

    try {
      const deleteResult = await deleteOrphanedDocuments(ownerId, report);
      setResult(deleteResult);
      setReport(null);
      toast.success(deleteResult.message);
    } catch (err) {
      console.error("Orphan cleanup failed:", err);
      setError(err.message || "Cleanup failed. Please try again.");
      toast.error("Cleanup failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm theme-muted-text leading-6">
        Scan for meal, deposit, and settings records that reference members who
        no longer exist. This can happen if members were deleted before the
        cascade-delete fix was applied.
      </p>
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {result && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-500">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}
      {report && report.totalOrphans > 0 && (
        <div className="rounded-2xl border theme-muted p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold theme-text">
              Dry-Run Results
            </p>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-400">
              {report.totalOrphans} orphan{report.totalOrphans === 1 ? "" : "s"} found
            </span>
          </div>

          <p className="text-xs theme-muted-text">
            Active members: {report.validMemberCount} · Scanned {new Date(report.scannedAt).toLocaleTimeString()}
          </p>

          <div className="space-y-2">
            {Object.entries(report.collections).map(([key, data]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl theme-card p-3 text-sm"
              >
                <span className="font-medium theme-text">
                  {COLLECTION_LABELS[key] || key}
                </span>
                <span className={`font-bold ${data.orphaned > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  {data.orphaned} / {data.total}
                </span>
              </div>
            ))}
          </div>
          {Object.entries(report.collections)
            .filter(([, data]) => data.samples.length > 0)
            .slice(0, 2)
            .map(([key, data]) => (
              <div key={`sample-${key}`} className="text-xs theme-muted-text">
                <p className="font-semibold mb-1">{COLLECTION_LABELS[key]} samples:</p>
                {data.samples.map((s) => (
                  <p key={s.id} className="ml-2">
                    • {s.date || "no date"} — memberId: {s.memberId.slice(0, 8)}…
                    {s.title ? ` (${s.title})` : ""}
                  </p>
                ))}
              </div>
            ))}
        </div>
      )}

      {report && report.totalOrphans === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-500">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>No orphaned records found. Your database is clean.</span>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning || deleting || Boolean(result)}
          className="flex items-center gap-2 rounded-2xl border theme-muted px-4 py-3 text-sm font-bold theme-text transition hover:bg-[var(--bg-card)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scanning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {scanning ? "Scanning..." : result ? "Cleanup Complete" : "Scan for Orphans"}
        </button>

        {report && report.totalOrphans > 0 && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            {deleting ? "Deleting..." : `Delete ${report.totalOrphans} Orphan${report.totalOrphans === 1 ? "" : "s"}`}
          </button>
        )}
      </div>

      {result && (
        <p className="text-xs theme-muted-text">
          Cleanup completed. Refresh the page to see updated data. You can re-scan to verify.
        </p>
      )}
    </div>
  );
}
