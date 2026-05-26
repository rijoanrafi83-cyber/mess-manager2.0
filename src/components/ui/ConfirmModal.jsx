import { Modal, Button } from "../ui";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = "Confirm Action",
  message = "Are you sure? This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
}) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <p className="text-sm theme-muted-text mb-6">{message}</p>
      <div className="flex gap-3">
        <Button
          variant={variant}
          loading={loading}
          onClick={onConfirm}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1"
        >
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
}
