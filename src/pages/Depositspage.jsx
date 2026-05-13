import { useState, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Wallet, Plus, Trash2, Edit2, TrendingUp, CheckCircle } from "lucide-react";
import {
  PageWrapper, PageHeader, Card, Button, Input, Select,
  Textarea, Modal, Badge, EmptyState, SearchInput, Table, StatCard
} from "../components/ui";
import { addDeposit, updateDeposit, deleteDeposit } from "../services/firestoreService";
import { formatCurrency } from "../utils/billing";

const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Rocket", "Bank Transfer", "Other"];

const defaultForm = {
  memberId: "", amount: "", paymentMethod: "Cash",
  date: new Date().toISOString().split("T")[0], note: "",
};

function DepositForm({ members, ownerId, initial, onClose }) {
  const [form, setForm] = useState(initial || { ...defaultForm, memberId: members[0]?.id || "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.memberId) e.memberId = "Select a member";
    if (!form.amount || isNaN(Number(form.amount))) e.amount = "Valid amount required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = { ...form, amount: Number(form.amount) };
      if (initial?.id) await updateDeposit(initial.id, data);
      else await addDeposit(ownerId, data);
      toast.success(initial ? "Deposit updated!" : "Deposit recorded!");
      onClose();
    } catch {
      toast.error("Failed to save deposit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Member" value={form.memberId} onChange={e => set("memberId", e.target.value)} error={errors.memberId} required>
          <option value="">Select member...</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Input label="Amount (৳)" type="number" min="1" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} error={errors.amount} required />
        <Select label="Payment Method" value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} required />
      </div>
      <Textarea label="Note" value={form.note} onChange={e => set("note", e.target.value)} placeholder="Optional note..." />
      <div className="flex gap-3">
        <Button type="submit" loading={loading} className="flex-1">{initial ? "Update" : "Record Deposit"}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function DepositsPage({ deposits = [], members = [], ownerId }) {
  const [showAdd,   setShowAdd]   = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [delId,     setDelId]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [filterMem, setFilterMem] = useState("all");
  const [loading,   setLoading]   = useState(false);

  const filtered = useMemo(() => {
    let list = deposits;
    if (filterMem !== "all") list = list.filter(d => d.memberId === filterMem);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => {
        const m = members.find(mb => mb.id === d.memberId);
        return m?.name?.toLowerCase().includes(q) || d.paymentMethod?.toLowerCase().includes(q);
      });
    }
    return [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [deposits, filterMem, search, members]);

  const totalDeposits = useMemo(() => deposits.reduce((s, d) => s + Number(d.amount || 0), 0), [deposits]);
  const filteredTotal = useMemo(() => filtered.reduce((s, d) => s + Number(d.amount || 0), 0), [filtered]);

  const memberDepositMap = useMemo(() => {
    const map = {};
    deposits.forEach(d => {
      map[d.memberId] = (map[d.memberId] || 0) + Number(d.amount || 0);
    });
    return map;
  }, [deposits]);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    try {
      await deleteDeposit(delId);
      toast.success("Deposit deleted");
      setDelId(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }, [delId]);

  const memberName = (id) => members.find(m => m.id === id)?.name || "Unknown";

  const methodBadge = (m) => {
    const variants = { Cash: "default", bKash: "purple", Nagad: "warning", Rocket: "info" };
    return <Badge variant={variants[m] || "default"}>{m}</Badge>;
  };

  const columns = [
    {
      key: "memberId", label: "Member",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 text-xs font-bold">
            {memberName(v).charAt(0)}
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white">{memberName(v)}</span>
        </div>
      )
    },
    { key: "date", label: "Date" },
    { key: "paymentMethod", label: "Method", render: (v) => methodBadge(v) },
    { key: "note", label: "Note", render: (v) => <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px] block">{v || "—"}</span> },
    {
      key: "amount", label: "Amount",
      render: (v) => <span className="font-semibold text-green-600 dark:text-green-400 text-sm">+{formatCurrency(v)}</span>
    },
    {
      key: "id", label: "",
      render: (id, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={e => { e.stopPropagation(); setEditItem(row); }}><Edit2 size={12} /></Button>
          <Button variant="danger" size="xs" onClick={e => { e.stopPropagation(); setDelId(id); }}><Trash2 size={12} /></Button>
        </div>
      )
    },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Deposits"
        subtitle={`${deposits.length} deposits · Total: ${formatCurrency(totalDeposits)}`}
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Record Deposit
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Collected" value={formatCurrency(totalDeposits)} icon={TrendingUp} iconBg="bg-green-500/10" iconColor="text-green-500" />
        <StatCard label="Filtered Total" value={formatCurrency(filteredTotal)} icon={Wallet} iconBg="bg-blue-500/10" iconColor="text-blue-500" />
        <StatCard label="Transactions" value={deposits.length} icon={CheckCircle} iconBg="bg-violet-500/10" iconColor="text-violet-500" />
      </div>

      {/* Member summary cards */}
      {members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {members.map(m => (
            <div key={m.id} className="p-4 bg-white dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium mb-1">{m.name}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(memberDepositMap[m.id] || 0)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search deposits..." className="flex-1" />
        <Select value={filterMem} onChange={e => setFilterMem(e.target.value)} wrapperClass="sm:w-44">
          <option value="all">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </div>

      <Card noPad>
        <Table
          columns={columns}
          data={filtered}
          emptyState={
            <div className="p-12">
              <EmptyState icon={Wallet} title="No deposits yet" description="Record member deposit payments here." action={<Button onClick={() => setShowAdd(true)}><Plus size={16}/>Record Deposit</Button>} />
            </div>
          }
        />
      </Card>

      <AnimatePresence>
        {showAdd && (
          <Modal open onClose={() => setShowAdd(false)} title="Record Deposit" subtitle="Log a member's payment">
            <DepositForm members={members} ownerId={ownerId} onClose={() => setShowAdd(false)} />
          </Modal>
        )}
        {editItem && (
          <Modal open onClose={() => setEditItem(null)} title="Edit Deposit">
            <DepositForm members={members} ownerId={ownerId} initial={editItem} onClose={() => setEditItem(null)} />
          </Modal>
        )}
        {delId && (
          <Modal open onClose={() => setDelId(null)} title="Delete Deposit" size="sm">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Delete this deposit record permanently?</p>
            <div className="flex gap-3">
              <Button variant="danger" loading={loading} onClick={handleDelete} className="flex-1">Delete</Button>
              <Button variant="secondary" onClick={() => setDelId(null)} className="flex-1">Cancel</Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}