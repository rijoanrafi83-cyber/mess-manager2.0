import { useState, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ShoppingCart, Plus, Trash2, Edit2, TrendingDown, Tag, ReceiptText, Layers3 } from "lucide-react";
import {
  PageWrapper, Card, Button, Input, Select,
  Textarea, Modal, Badge, EmptyState, SearchInput, Table
} from "../components/ui";
import {
  ActivityTimeline,
  FilterSurface,
  MetricCard,
  SmartHero,
  SmartSection,
} from "../components/SmartUI";
import { addBazaar, updateBazaar, deleteBazaar } from "../services/firestoreService";
import { formatCurrency } from "../utils/billing";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useChartTheme } from "../hooks/useChartTheme";

const CATEGORIES = ["Grocery", "Vegetables", "Fish & Meat", "Spices", "Cooking Gas", "Utilities", "Cleaning", "Other"];

const defaultForm = {
  title: "", amount: "", category: "Grocery",
  buyerName: "", date: new Date().toISOString().split("T")[0], note: "",
};

function BazaarForm({ initial, ownerId, userProfile, onClose }) {
  const [form, setForm] = useState(initial || defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim())  e.title  = "Title required";
    if (!form.amount || isNaN(Number(form.amount))) e.amount = "Valid amount required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = { ...form, ownerId, amount: Number(form.amount) };
      if (initial?.id) await updateBazaar(initial.id, data, userProfile, ownerId);
      else await addBazaar(ownerId, data, null, userProfile);
      toast.success(initial ? "Expense updated!" : "Expense added!");
      onClose();
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Title" value={form.title} onChange={e => set("title", e.target.value)} error={errors.title} required />
        <Input label="Amount (৳)" type="number" min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} error={errors.amount} required />
        <Select label="Category" value={form.category} onChange={e => set("category", e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Buyer Name" value={form.buyerName} onChange={e => set("buyerName", e.target.value)} placeholder="Who bought this?" />
        <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} required />
      </div>
      <Textarea label="Note" value={form.note} onChange={e => set("note", e.target.value)} placeholder="Optional details..." />
      <div className="flex gap-3">
        <Button type="submit" loading={loading} className="flex-1">
          {initial ? "Update Expense" : "Add Expense"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function BazaarPage({ bazaar = [], ownerId, userProfile }) {
  const canManage = ["admin", "manager"].includes(userProfile?.role);
  const [showAdd,      setShowAdd]      = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [delId,        setDelId]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterCat,    setFilterCat]    = useState("all");
  const [loading,      setLoading]      = useState(false);
  const chartTheme = useChartTheme();

  const filtered = useMemo(() => {
    let list = bazaar;
    if (filterCat !== "all") list = list.filter(b => b.category === filterCat);
    if (search) list = list.filter(b =>
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.buyerName?.toLowerCase().includes(search.toLowerCase())
    );
    return [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [bazaar, filterCat, search]);

  const totalFiltered = useMemo(() => filtered.reduce((s, b) => s + Number(b.amount || 0), 0), [filtered]);
  const totalAll      = useMemo(() => bazaar.reduce((s, b) => s + Number(b.amount || 0), 0), [bazaar]);
  const averageExpense = bazaar.length ? totalAll / bazaar.length : 0;

  // Category chart data
  const catChartData = useMemo(() => {
    const map = {};
    bazaar.forEach(b => {
      const cat = b.category || "Other";
      map[cat] = (map[cat] || 0) + Number(b.amount || 0);
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [bazaar]);

  const activityItems = useMemo(
    () =>
      filtered.slice(0, 8).map((item) => ({
        id: item.id,
        title: item.title || "Expense",
        meta: `${item.date || "No date"} · ${item.buyerName || "Unknown buyer"} · ${item.category || "Other"}`,
        value: formatCurrency(item.amount),
        icon: <ReceiptText size={14} />,
        tone: "bg-orange-500/10 text-orange-500",
      })),
    [filtered]
  );

  const handleDelete = useCallback(async () => {
    if (!delId) return;
    setLoading(true);
    try {
      await deleteBazaar(delId, userProfile, ownerId);
      toast.success("Expense deleted");
      setDelId(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  }, [delId, ownerId, userProfile]);

  const columns = [
    {
      key: "title", label: "Expense",
      render: (v, row) => (
        <div>
          <p className="font-medium text-sm theme-text">{v}</p>
          {row.note && <p className="text-xs theme-muted-text truncate max-w-[200px]">{row.note}</p>}
        </div>
      )
    },
    { key: "date",      label: "Date" },
    { key: "buyerName", label: "Buyer", render: (v) => v || "—" },
    {
      key: "category", label: "Category",
      render: (v) => <Badge variant="info">{v}</Badge>
    },
    {
      key: "amount", label: "Amount",
      render: (v) => <span className="font-semibold theme-text">{formatCurrency(v)}</span>
    },
    ...(canManage ? [{
      key: "id", label: "",
      render: (id, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={e => { e.stopPropagation(); setEditItem(row); }}><Edit2 size={12} /></Button>
          <Button variant="danger" size="xs" onClick={e => { e.stopPropagation(); setDelId(id); }}><Trash2 size={12} /></Button>
        </div>
      )
    }] : []),
  ];

  return (
    <PageWrapper>
      <SmartHero
        eyebrow="Smart Expense Tracking"
        title="Bazaar"
        subtitle="Track every market run, category spend, buyer activity, and realtime totals without changing the existing bazaar ledger."
        metrics={[
          { label: "Total Spend", value: formatCurrency(totalAll), caption: "all bazaar entries" },
          { label: "Filtered", value: formatCurrency(totalFiltered), caption: "current view" },
          { label: "Average", value: formatCurrency(averageExpense), caption: "per transaction" },
          { label: "Categories", value: catChartData.length, caption: "active buckets" },
        ]}
        actions={canManage ? (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Expense
          </Button>
        ) : null}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Expenses" value={formatCurrency(totalAll)} icon={TrendingDown} tone="red" caption="all-time ledger" />
        <MetricCard label="This Filter" value={formatCurrency(totalFiltered)} icon={ShoppingCart} tone="orange" caption="visible records" />
        <MetricCard label="Entries" value={bazaar.length} icon={Tag} tone="blue" caption="transactions" />
        <MetricCard label="Categories" value={catChartData.length} icon={Layers3} tone="green" caption="spend groups" />
      </div>

      {/* Category chart */}
      {catChartData.length > 0 && (
        <SmartSection className="mb-6" title="Expense by Category" subtitle="Realtime category distribution">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={catChartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="name" tick={{ fill: chartTheme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartTheme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`৳${v}`, "Amount"]}
                contentStyle={{
                  background: chartTheme.tooltip.background,
                  border: `1px solid ${chartTheme.tooltip.border}`,
                  borderRadius: 12,
                  color: chartTheme.tooltip.color,
                  boxShadow: "var(--shadow-soft)",
                }}
                labelStyle={{ color: chartTheme.tooltip.color }}
              />
              <Bar dataKey="total" fill={chartTheme.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SmartSection>
      )}

      {/* Filters */}
      <FilterSurface>
        <SearchInput value={search} onChange={setSearch} placeholder="Search expenses..." className="flex-1" />
        <Select value={filterCat} onChange={e => setFilterCat(e.target.value)} wrapperClass="sm:w-44">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </FilterSurface>

      <SmartSection title="Recent Expense Timeline" subtitle="Latest filtered bazaar records" className="mb-6">
        <ActivityTimeline items={activityItems} empty="No bazaar activity found for this filter." />
      </SmartSection>

      <Card noPad>
        <Table
          columns={columns}
          data={filtered}
          emptyState={
            <div className="p-12">
              <EmptyState icon={ShoppingCart} title="No expenses found" description="Start tracking your mess expenses." action={canManage ? <Button onClick={() => setShowAdd(true)}><Plus size={16}/>Add Expense</Button> : null} />
            </div>
          }
        />
      </Card>

      <AnimatePresence>
        {canManage && showAdd && (
          <Modal open onClose={() => setShowAdd(false)} title="Add Expense" subtitle="Record a new bazaar or mess expense">
            <BazaarForm ownerId={ownerId} userProfile={userProfile} onClose={() => setShowAdd(false)} />
          </Modal>
        )}
        {canManage && editItem && (
          <Modal open onClose={() => setEditItem(null)} title="Edit Expense">
            <BazaarForm initial={editItem} ownerId={ownerId} userProfile={userProfile} onClose={() => setEditItem(null)} />
          </Modal>
        )}
        {canManage && delId && (
          <Modal open onClose={() => setDelId(null)} title="Delete Expense" size="sm">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Permanently delete this expense entry?</p>
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
