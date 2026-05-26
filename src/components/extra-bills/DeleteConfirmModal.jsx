import { Modal, Button } from "../ui";
import { AlertCircle } from "lucide-react";

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  billTitle = "this bill",
  isRecurring = false,
}) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Delete Extra Bill" size="sm">
      <div className="space-y-4">
        {isRecurring && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-500">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              This is a recurring bill. Deleting it will also stop future monthly carry-forwards.
            </span>
          </div>
        )}

        <p className="text-sm theme-muted-text">
          Delete <span className="font-bold theme-text">{billTitle}</span>? This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <Button
            variant="danger"
            loading={loading}
            onClick={onConfirm}
            className="flex-1"
          >
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
