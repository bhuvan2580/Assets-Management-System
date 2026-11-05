import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, ShieldCheck, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import api from "../services/api";

const ACTIONS = ["ALL", "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "ASSIGN", "RETURN", "UPLOAD"];
const ENTITIES = ["ALL", "AUTH", "ASSET", "EMPLOYEE", "VENDOR", "ASSIGNMENT", "REQUEST", "USER", "PROFILE"];
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function AuditLogs() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [entity, setEntity] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (nextPage = page) => {
    setLoading(true); setError("");
    try {
      const response = await api.get("/audit-logs", { params: { page: nextPage, per_page: 25, search, action, entity_type: entity } });
      setItems(response.data.items || []); setPages(Math.max(response.data.pages || 1, 1)); setTotal(response.data.total || 0); setPage(response.data.page || nextPage);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load audit logs. You may not have permission to view this page.");
    } finally { setLoading(false); }
  }, [page, search, action, entity]);

  useEffect(() => {
    const timer = setTimeout(() => loadLogs(page), 250);
    return () => clearTimeout(timer);
  }, [page, search, action, entity]);

  const badgeClass = (value) => `audit-badge audit-badge-${String(value || "other").toLowerCase()}`;

  return <section className="audit-page">
    <div className="audit-heading">
      <div className="audit-heading-icon"><ShieldCheck size={25} /></div>
      <div><h1>Audit Logs</h1><p>Review important changes made across the asset management system.</p></div>
      <button className="audit-refresh" onClick={() => loadLogs(page)} disabled={loading}><RefreshCw size={16} className={loading ? "audit-spin" : ""} /> Refresh</button>
    </div>
    <div className="audit-summary"><div><span>Total recorded events</span><strong>{total.toLocaleString()}</strong></div><div><span>Access</span><strong>Admin / Superuser</strong></div><div><span>History</span><strong><Clock3 size={16} /> Newest first</strong></div></div>
    <div className="audit-filters">
      <label className="audit-search"><Search size={18} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search actor, description, record ID…" /></label>
      <select aria-label="Filter by action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>{ACTIONS.map((item) => <option key={item} value={item}>{item === "ALL" ? "All actions" : item}</option>)}</select>
      <select aria-label="Filter by entity" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>{ENTITIES.map((item) => <option key={item} value={item}>{item === "ALL" ? "All record types" : item.replaceAll("_", " ")}</option>)}</select>
    </div>
    {error && <div className="audit-error" role="alert">{error}</div>}
    <div className="audit-table-card"><div className="audit-table-scroll"><table className="audit-table"><thead><tr><th>Date &amp; time</th><th>Performed by</th><th>Action</th><th>Record type</th><th>Description</th><th>Request</th></tr></thead><tbody>
      {loading ? <tr><td colSpan="6" className="audit-empty">Loading activity…</td></tr> : items.length === 0 ? <tr><td colSpan="6" className="audit-empty">No audit events found for these filters.</td></tr> : items.map((item) => <tr key={item.id}><td className="audit-date">{formatDate(item.created_at)}</td><td><strong>{item.actor_name}</strong><small>{item.actor_email || "—"}</small><small>{item.actor_role || item.actor_type}</small></td><td><span className={badgeClass(item.action)}>{item.action}</span></td><td>{item.entity_type?.replaceAll("_", " ") || "—"}{item.entity_id && <small>ID: {item.entity_id}</small>}</td><td>{item.description}</td><td><span className="audit-method">{item.method}</span><small>{item.status_code} · {item.endpoint}</small></td></tr>)}
    </tbody></table></div><div className="audit-pagination"><span>Showing {items.length ? ((page - 1) * 25 + 1) : 0}–{Math.min(page * 25, total)} of {total}</span><div><button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1 || loading} aria-label="Previous page"><ChevronLeft size={18} /></button><span>Page {page} of {pages}</span><button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page >= pages || loading} aria-label="Next page"><ChevronRight size={18} /></button></div></div></div>
  </section>;
}
