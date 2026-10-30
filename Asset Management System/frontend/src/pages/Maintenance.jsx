import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Download,
} from "lucide-react";

import * as XLSX from "xlsx";
import api from "../services/api";

const STATUSES = [
  ["REPORTED", "Reported"],
  ["UNDER_INSPECTION", "Under inspection"],
  ["AWAITING_PARTS", "Awaiting parts"],
  ["UNDER_REPAIR", "Under repair"],
  ["COMPLETED", "Completed"],
  ["UNREPAIRABLE", "Unrepairable"],
];

const blankForm = () => ({
  asset_id: "",
  issue_title: "",
  description: "",
  reported_date: new Date().toISOString().slice(0, 10),
  assigned_to: "",
  vendor_id: "",
  repair_cost: "0",
  warranty_claim: false,
  remarks: "",
});

export default function Maintenance() {
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);

    try {
      const [m, a, v, s, all] = await Promise.all([
        api.get("/maintenance", {
          params: { search, status: statusFilter },
        }),
        api.get("/assets"),
        api.get("/vendors"),
        api.get("/maintenance/summary"),
        api.get("/maintenance", {
          params: { search: "", status: "ALL" },
        }),
      ]);

      setItems(m.data.items || []);
      setAllItems(all.data.items || []);
      setAssets(Array.isArray(a.data) ? a.data : a.data.items || []);
      setVendors(Array.isArray(v.data) ? v.data : v.data.items || []);
      setSummary(s.data || {});
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Could not load maintenance records. Check the backend and database migration."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  const activeAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          !["RETIRED", "LOST", "UNREPAIRABLE"].includes(
            String(a.status || "").toUpperCase()
          )
      ),
    [assets]
  );

  const pendingRepairCost = useMemo(
    () =>
      allItems
        .filter((item) => item.status !== "COMPLETED")
        .reduce(
          (total, item) => total + Number(item.repair_cost || 0),
          0
        ),
    [allItems]
  );

  const setField = (key, value) =>
    setForm((old) => ({ ...old, [key]: value }));

  const createRecord = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.post("/maintenance", {
        ...form,
        asset_id: Number(form.asset_id),
        vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
        repair_cost: Number(form.repair_cost || 0),
      });

      setShowCreate(false);
      setForm(blankForm());
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not create maintenance record.");
    } finally {
      setSaving(false);
    }
  };

  const saveUpdate = async () => {
    if (!editing) return;

    setSaving(true);
    setError("");

    try {
      await api.patch(`/maintenance/${editing.id}`, {
        status: editing.status,
        assigned_to: editing.assigned_to || null,
        vendor_id: editing.vendor_id || null,
        repair_cost: Number(editing.repair_cost || 0),
        warranty_claim: Boolean(editing.warranty_claim),
        resolution: editing.resolution || null,
        remarks: editing.remarks || null,
      });

      setEditing(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not update maintenance record.");
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (value) =>
    STATUSES.find(([key]) => key === value)?.[1] || value;

  const dateLabel = (value) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "—";

  const currency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const downloadExcel = () => {
    const exportData = allItems.map((item) => ({
      "Record ID": item.id,
      "Asset Tag": item.asset_tag || "",
      "Asset Type": item.asset_type || "",
      "Brand / Model": item.asset_brand_model || "",
      "Issue Title": item.issue_title || "",
      "Description": item.description || "",
      "Reported Date": item.reported_date || "",
      "Assigned Technician": item.assigned_to || "",
      "Vendor": item.vendor_name || "",
      "Status": statusLabel(item.status),
      "Repair Cost (INR)": Number(item.repair_cost || 0),
      "Warranty Claim": item.warranty_claim ? "Yes" : "No",
      "Resolution": item.resolution || "",
      "Remarks": item.remarks || "",
    }));

    if (exportData.length === 0) {
      setError("No maintenance records available to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 30 },
      { wch: 40 },
      { wch: 16 },
      { wch: 24 },
      { wch: 24 },
      { wch: 22 },
      { wch: 18 },
      { wch: 16 },
      { wch: 40 },
      { wch: 40 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Maintenance Records"
    );

    XLSX.writeFile(
      workbook,
      `Maintenance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <section className="maintenance-page">
      <header className="maintenance-header">
        <div>
          <div className="maintenance-eyebrow">
            ASSET LIFECYCLE
          </div>

          <h1>
            <Wrench size={25} />
            Maintenance Management
          </h1>

          <p>
            Track repairs, service costs, and maintenance history for company
            assets.
          </p>
        </div>

        <div className="maintenance-header-actions">
          <button
            type="button"
            className="maintenance-secondary"
            onClick={downloadExcel}
          >
            <Download size={17} />
            Download Excel
          </button>

          <button
            type="button"
            className="maintenance-primary"
            onClick={() => {
              setError("");
              setForm(blankForm());
              setShowCreate(true);
            }}
          >
            <Plus size={17} />
            New maintenance record
          </button>
        </div>
      </header>

      {error && (
        <div className="maintenance-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="maintenance-stats">
        <Stat
          icon={Clock3}
          label="Open records"
          value={summary.open_records ?? "—"}
        />
        <Stat
          icon={Wrench}
          label="Under repair"
          value={summary.under_repair ?? "—"}
        />
        <Stat
          icon={AlertTriangle}
          label="Awaiting parts"
          value={summary.awaiting_parts ?? "—"}
        />
        <Stat
          icon={CheckCircle2}
          label="Completed this month"
          value={summary.completed_this_month ?? "—"}
        />
        <Stat
          icon={Wrench}
          label="Total repair cost"
          value={currency(summary.total_repair_cost)}
        />
        <Stat
          icon={Clock3}
          label="Pending repair cost"
          value={currency(pendingRepairCost)}
        />
      </div>

      <div className="maintenance-toolbar">
        <label className="maintenance-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset, issue, technician…"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="maintenance-secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="maintenance-table-wrap">
        <table className="maintenance-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Issue</th>
              <th>Reported</th>
              <th>Assigned to</th>
              <th>Status</th>
              <th>Repair cost</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="maintenance-empty">
                  Loading maintenance records…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="7" className="maintenance-empty">
                  No maintenance records found. Select “New maintenance record”
                  to report an issue.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.asset_tag}</strong>
                    <small>
                      {[item.asset_type, item.asset_brand_model]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </td>
                  <td>
                    <strong>{item.issue_title}</strong>
                    <small>
                      {item.description || "No additional description"}
                    </small>
                  </td>
                  <td>{dateLabel(item.reported_date)}</td>
                  <td>
                    {item.assigned_to || "—"}
                    <small>{item.vendor_name || ""}</small>
                  </td>
                  <td>
                    <span
                      className={`maintenance-status status-${item.status
                        .toLowerCase()
                        .replaceAll("_", "-")}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td>{currency(item.repair_cost)}</td>
                  <td>
                    <button
                      className="maintenance-link"
                      disabled={["COMPLETED", "UNREPAIRABLE"].includes(
                        item.status
                      )}
                      onClick={() =>
                        setEditing({
                          ...item,
                          vendor_id: item.vendor_id
                            ? String(item.vendor_id)
                            : "",
                          repair_cost: String(item.repair_cost || 0),
                        })
                      }
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div
          className="maintenance-overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setShowCreate(false)
          }
        >
          <form className="maintenance-modal" onSubmit={createRecord}>
            <div className="maintenance-modal-head">
              <div>
                <h2>New maintenance record</h2>
                <p>Report an asset fault or service requirement.</p>
              </div>
              <button
                type="button"
                className="maintenance-close"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </div>

            <label>
              Asset
              <select
                required
                value={form.asset_id}
                onChange={(e) => setField("asset_id", e.target.value)}
              >
                <option value="">Select an asset</option>
                {activeAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_tag} — {asset.asset_type} ({asset.status})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Issue title
              <input
                required
                maxLength="200"
                value={form.issue_title}
                onChange={(e) => setField("issue_title", e.target.value)}
                placeholder="e.g. Laptop not powering on"
              />
            </label>

            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows="3"
                placeholder="Describe the issue or maintenance required"
              />
            </label>

            <div className="maintenance-form-grid">
              <label>
                Reported date
                <input
                  type="date"
                  required
                  value={form.reported_date}
                  onChange={(e) => setField("reported_date", e.target.value)}
                />
              </label>
              <label>
                Technician / assigned to
                <input
                  value={form.assigned_to}
                  onChange={(e) => setField("assigned_to", e.target.value)}
                  placeholder="Name or team"
                />
              </label>
            </div>

            <div className="maintenance-form-grid">
              <label>
                Repair vendor
                <select
                  value={form.vendor_id}
                  onChange={(e) => setField("vendor_id", e.target.value)}
                >
                  <option value="">No vendor selected</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name || vendor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Initial cost (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.repair_cost}
                  onChange={(e) => setField("repair_cost", e.target.value)}
                />
              </label>
            </div>

            <label className="maintenance-checkbox">
              <input
                type="checkbox"
                checked={form.warranty_claim}
                onChange={(e) => setField("warranty_claim", e.target.checked)}
              />
              This repair is covered by warranty
            </label>

            <label>
              Remarks
              <textarea
                rows="2"
                value={form.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
              />
            </label>

            <div className="maintenance-modal-actions">
              <button
                type="button"
                className="maintenance-secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button className="maintenance-primary" disabled={saving}>
                {saving ? "Saving…" : "Create record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div
          className="maintenance-overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setEditing(null)
          }
        >
          <div className="maintenance-modal">
            <div className="maintenance-modal-head">
              <div>
                <h2>Update maintenance</h2>
                <p>
                  {editing.asset_tag} · {editing.issue_title}
                </p>
              </div>
              <button
                className="maintenance-close"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                <X />
              </button>
            </div>

            <label>
              Status
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing((old) => ({ ...old, status: e.target.value }))
                }
              >
                {STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Technician / assigned to
              <input
                value={editing.assigned_to || ""}
                onChange={(e) =>
                  setEditing((old) => ({
                    ...old,
                    assigned_to: e.target.value,
                  }))
                }
              />
            </label>

            <label>
              Repair vendor
              <select
                value={editing.vendor_id || ""}
                onChange={(e) =>
                  setEditing((old) => ({ ...old, vendor_id: e.target.value }))
                }
              >
                <option value="">No vendor selected</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name || vendor.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Repair cost (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={editing.repair_cost || "0"}
                onChange={(e) =>
                  setEditing((old) => ({
                    ...old,
                    repair_cost: e.target.value,
                  }))
                }
              />
            </label>

            <label className="maintenance-checkbox">
              <input
                type="checkbox"
                checked={Boolean(editing.warranty_claim)}
                onChange={(e) =>
                  setEditing((old) => ({
                    ...old,
                    warranty_claim: e.target.checked,
                  }))
                }
              />
              Warranty claim
            </label>

            <label>
              Resolution
              <textarea
                rows="3"
                value={editing.resolution || ""}
                onChange={(e) =>
                  setEditing((old) => ({
                    ...old,
                    resolution: e.target.value,
                  }))
                }
                placeholder="What was done to resolve the issue?"
              />
            </label>

            <label>
              Remarks
              <textarea
                rows="2"
                value={editing.remarks || ""}
                onChange={(e) =>
                  setEditing((old) => ({ ...old, remarks: e.target.value }))
                }
              />
            </label>

            <div className="maintenance-modal-actions">
              <button
                className="maintenance-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                className="maintenance-primary"
                disabled={saving}
                onClick={saveUpdate}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="maintenance-stat">
      <span>
        <Icon size={18} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
