/**
 * MemberSelector
 *
 * Reusable checkbox list for selecting which members are included in an extra bill.
 * Supports select all/deselect all, displays count, and scrolls on mobile.
 */

import { PersonAvatar } from "../SmartUI";

export function MemberSelector({ members = [], selectedIds = [], onChange }) {
  const allSelected = members.length > 0 && selectedIds.length === members.length;
  const noneSelected = selectedIds.length === 0;

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(members.map((m) => m.id));
    }
  };

  const toggleMember = (memberId) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onChange([...selectedIds, memberId]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with count and toggle */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold theme-muted-text uppercase tracking-wider">
          {selectedIds.length} of {members.length} members selected
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-bold theme-accent-text hover:brightness-110 transition"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* Scrollable member list */}
      <div className="max-h-48 overflow-y-auto rounded-2xl border theme-muted p-2 space-y-1">
        {members.map((member) => {
          const isSelected = selectedIds.includes(member.id);

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMember(member.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                isSelected
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  : "hover:bg-[var(--bg-card-muted)]"
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-[var(--border-soft)]"
              }`}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <PersonAvatar name={member.name} size="sm" />

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${isSelected ? "theme-text" : "theme-muted-text"}`}>
                  {member.name}
                </p>
                {member.roomNumber && (
                  <p className="text-[10px] theme-muted-text">Room {member.roomNumber}</p>
                )}
              </div>
            </button>
          );
        })}

        {members.length === 0 && (
          <p className="text-sm theme-muted-text text-center py-4">
            No active members found.
          </p>
        )}
      </div>

      {/* Validation hint */}
      {noneSelected && members.length > 0 && (
        <p className="text-xs text-red-500 font-semibold">
          At least one member must be selected.
        </p>
      )}
    </div>
  );
}
