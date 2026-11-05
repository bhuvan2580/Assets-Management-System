import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ClipboardCheck, Download, MapPin, Plus, QrCode, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import api from "../services/api";
import "../css/23-qr-physical-audits.css";

export default function QrAudits() {
  const [assets, setAssets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCameraUnsupported, setShowCameraUnsupported] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: `Physical Audit ${new Date().toLocaleDateString()}`, location: "", notes: "" });
  const [scanCode, setScanCode] = useState("");
  const [observedLocation, setObservedLocation] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanLockRef = useRef(false);
  const scanInputRef = useRef(null);
  const scanBurstRef = useRef({ lastAt: 0, count: 0 });
  const scanDebounceRef = useRef(null);

  const loadBase = useCallback(async () => {
    setError("");
    try {
      const [a, s] = await Promise.all([api.get("/assets"), api.get("/qr-audits/sessions")]);
      setAssets(Array.isArray(a.data) ? a.data : (a.data.items || []));
      setSessions(s.data.items || []);
    } catch (e) { setError(e.response?.data?.message || "Could not load QR tracking data. Check the backend and database migration."); }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    try {
      const res = await api.get(`/qr-audits/sessions/${id}`);
      setDetail(res.data);
    } catch (e) { setError(e.response?.data?.message || "Could not load audit details."); }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);
  useEffect(() => () => { stopCamera(); if (scanDebounceRef.current) window.clearTimeout(scanDebounceRef.current); }, []);

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const downloadQr = async (asset) => {
    setError("");
    try {
      const response = await api.get(`/qr-audits/assets/${asset.id}/qr`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${asset.asset_tag || `asset-${asset.id}`}-QR.png`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setNotice(`QR label downloaded for ${asset.asset_tag}.`);
    } catch (e) { setError(e.response?.data?.message || "Could not generate QR code. Install the backend QR dependency and restart Flask."); }
  };

  const createAudit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await api.post("/qr-audits/sessions", form);
      const id = response.data.item.id;
      setShowCreate(false); setSelectedId(id); await loadBase(); await loadDetail(id);
      setNotice("Physical audit created. Scan asset QR labels or enter an asset tag.");
    } catch (e) { setError(e.response?.data?.message || "Could not create audit session."); }
    finally { setBusy(false); }
  };

  const submitScan = async (raw = scanCode) => {
    if (!selectedId || !raw.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await api.post(`/qr-audits/sessions/${selectedId}/scan`, { code: raw.trim(), observed_location: observedLocation });
      if (response.data.duplicate) {
        setError(response.data.message || "This asset has already been scanned in this audit.");
        setNotice("");
      } else {
        setNotice(response.data.message || `Scanned ${response.data.asset?.asset_tag || "asset"} successfully.`);
        setError("");
      }
      setScanCode("");
      await loadDetail(selectedId); await loadBase();
      requestAnimationFrame(() => scanInputRef.current?.focus());
    } catch (e) {
      setError(e.response?.data?.message || "Could not record this scan.");
      setScanCode("");
      requestAnimationFrame(() => scanInputRef.current?.focus());
    }
    finally { setBusy(false); scanLockRef.current = false; }
  };

  const startCamera = async () => {
    setError("");
    if (!("BarcodeDetector" in window)) {
      setShowCameraUnsupported(true);
      return;
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      detectorRef.current = detector;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const tick = async () => {
        if (!streamRef.current || !videoRef.current || !detectorRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length && !scanLockRef.current) {
            scanLockRef.current = true;
            await submitScan(codes[0].rawValue);
          }
        } catch { /* camera frames can be temporarily unavailable */ }
        if (streamRef.current) window.setTimeout(tick, 450);
      };
      window.setTimeout(tick, 450);
    } catch (e) { stopCamera(); setError(e.message || "Could not access the camera. Check browser camera permissions."); }
  };

  const completeAudit = async () => {
    if (!selectedId) return;
    setConfirmComplete(true);
  };

  const confirmCompleteAudit = async () => {
    setConfirmComplete(false);
    setBusy(true); setError("");
    try { await api.post(`/qr-audits/sessions/${selectedId}/complete`); stopCamera(); await loadDetail(selectedId); await loadBase(); setNotice("Audit completed successfully."); }
    catch (e) { setError(e.response?.data?.message || "Could not complete audit."); }
    finally { setBusy(false); }
  };

  const filteredAssets = assets.filter(a => [a.asset_tag, a.asset_type, a.brand, a.model, a.serial_number, a.location].some(v => String(v || "").toLowerCase().includes(assetSearch.toLowerCase())));
  const money = value => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value || 0));

  return <section className="qr-page">
    <header className="qr-header"><div><div className="qr-eyebrow">INVENTORY CONTROL</div><h1><QrCode size={27} /> QR Tracking & Physical Audits</h1><p>Download asset labels, conduct physical inventory checks, and identify assets that were not found.</p></div><button className="qr-primary" onClick={() => { setError(""); setShowCreate(true); }}><Plus size={17} /> New physical audit</button></header>
    {(error || notice || showCameraUnsupported) && <div className="qr-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && (setError(""), setNotice(""), setShowCameraUnsupported(false))}>
      <div className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-notification-title">
        <div className="qr-modal-head">
          <div>
            <h2 id="qr-notification-title">{showCameraUnsupported ? "Live QR scanning unavailable" : error ? "Attention" : "Success"}</h2>
            <p>{showCameraUnsupported ? "Your current browser does not support the live QR scanner used by this page." : error || notice}</p>
          </div>
          <button type="button" className="qr-icon-button" aria-label="Close notification" onClick={() => { setError(""); setNotice(""); setShowCameraUnsupported(false); }}><X /></button>
        </div>
        {showCameraUnsupported && <>
          <p>You can still scan assets using a USB or wireless QR scanner, or type the asset tag into the scan field.</p>
          <p>For camera scanning, try a supported version of Chrome or Edge on HTTPS or localhost.</p>
        </>}
        <div className="qr-modal-actions">
          {showCameraUnsupported && <button type="button" className="qr-primary" onClick={() => { setShowCameraUnsupported(false); requestAnimationFrame(() => scanInputRef.current?.focus()); }}>Use scanner / enter tag</button>}
          <button type="button" className="qr-secondary" onClick={() => { setError(""); setNotice(""); setShowCameraUnsupported(false); }}>Close</button>
        </div>
      </div>
    </div>}
    <div className="qr-metrics"><div><span><QrCode size={19} /></span><small>Registered assets</small><strong>{assets.length}</strong></div><div><span><ClipboardCheck size={19} /></span><small>Audit sessions</small><strong>{sessions.length}</strong></div><div><span><CheckCircle2 size={19} /></span><small>Completed audits</small><strong>{sessions.filter(s => s.status === "COMPLETED").length}</strong></div></div>

    <div className="qr-columns">
      <section className="qr-card qr-assets-card"><div className="qr-card-title"><div><h2>Asset QR labels</h2><p>Download and print a unique QR code for each asset.</p></div><button className="qr-icon-button" onClick={loadBase} title="Refresh"><RefreshCw size={17} /></button></div>
        <label className="qr-search"><Search size={16} /><input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="Search asset tag, model, serial…" /></label>
        <div className="qr-table-scroll"><table className="qr-table"><thead><tr><th>Asset</th><th>Status</th><th>Location</th><th></th></tr></thead><tbody>{filteredAssets.length ? filteredAssets.map(a => <tr key={a.id}><td><strong>{a.asset_tag}</strong><small>{[a.asset_type, a.brand, a.model].filter(Boolean).join(" · ")}</small></td><td><span className="qr-status">{a.status || "—"}</span></td><td>{a.location || "—"}</td><td><button className="qr-download" onClick={() => downloadQr(a)} title="Download QR PNG"><Download size={16} /> QR</button></td></tr>) : <tr><td colSpan="4" className="qr-empty">No matching assets.</td></tr>}</tbody></table></div>
      </section>
      <section className="qr-card qr-audits-card"><div className="qr-card-title"><div><h2>Physical audit sessions</h2><p>Open an audit to scan assets and review missing items.</p></div><button className="qr-icon-button" onClick={loadBase} title="Refresh"><RefreshCw size={17} /></button></div>
        <div className="qr-session-list">{sessions.length ? sessions.map(s => <button key={s.id} className={`qr-session ${selectedId === s.id ? "selected" : ""}`} onClick={() => { setSelectedId(s.id); setError(""); }}><span className="qr-session-icon"><ClipboardCheck size={19} /></span><span className="qr-session-text"><strong>{s.name}</strong><small>{s.location || "All locations"} · {s.scanned_count || 0} scanned</small></span><span className={`qr-session-status ${s.status === "COMPLETED" ? "complete" : "open"}`}>{s.status === "COMPLETED" ? "Completed" : "In progress"}</span></button>) : <div className="qr-empty qr-empty-panel">No audit sessions yet. Create one to get started.</div>}</div>
      </section>
    </div>

    {detail && <section className="qr-card qr-detail-card"><div className="qr-card-title"><div><div className="qr-eyebrow">AUDIT SESSION #{detail.item.id}</div><h2>{detail.item.name}</h2><p>{detail.item.location || "All locations"} · Created {detail.item.created_at ? new Date(detail.item.created_at).toLocaleString() : "—"}</p></div><div className="qr-detail-actions"><button className="qr-secondary" onClick={() => loadDetail(selectedId)}><RefreshCw size={15} /> Refresh</button>{detail.item.status !== "COMPLETED" && <button className="qr-primary" disabled={busy} onClick={completeAudit}><CheckCircle2 size={16} /> Complete audit</button>}</div></div>
      <div className="qr-progress"><div><small>Assets scanned</small><strong>{detail.summary.scanned} / {detail.summary.expected}</strong></div><div className="qr-progress-track"><span style={{ width: `${detail.summary.expected ? Math.min(100, detail.summary.scanned / detail.summary.expected * 100) : 0}%` }} /></div><small>{detail.summary.missing} not scanned</small></div>
      {detail.item.status !== "COMPLETED" && <div className="qr-scan-panel"><div className="qr-scan-heading"><div><h3><Camera size={19} /> Scan an asset</h3><p>Use a camera with QR support, or enter the asset tag / QR text manually.</p></div><button className="qr-secondary" onClick={cameraOn ? stopCamera : startCamera}><Camera size={16} />{cameraOn ? "Stop camera" : "Start camera"}</button></div>
        {cameraOn && <div className="qr-video-wrap"><video ref={videoRef} playsInline muted /><span>Point the camera at an asset QR label.</span></div>}
        <form className="qr-scan-form" onSubmit={e => { e.preventDefault(); if (!scanLockRef.current) { scanLockRef.current = true; submitScan(); } }}><input
          ref={scanInputRef}
          value={scanCode}
          onChange={e => {
            const value = e.target.value;
            setScanCode(value);
            // USB/Bluetooth scanners usually type a complete code very quickly. Submit
            // automatically after a short quiet period when the input arrived as a burst.
            if (scanDebounceRef.current) window.clearTimeout(scanDebounceRef.current);
            const now = Date.now();
            const burst = scanBurstRef.current;
            if (now - burst.lastAt < 80) burst.count += 1; else burst.count = 1;
            burst.lastAt = now;
            if (value.trim().length >= 3) {
              scanDebounceRef.current = window.setTimeout(() => {
                if (burst.count >= 3 && !scanLockRef.current && !busy && value.trim()) {
                  scanLockRef.current = true;
                  submitScan(value);
                }
              }, 220);
            }
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (scanDebounceRef.current) window.clearTimeout(scanDebounceRef.current);
              if (!scanLockRef.current && scanCode.trim()) { scanLockRef.current = true; submitScan(scanCode); }
            }
          }}
          autoComplete="off"
          placeholder="Scan QR code here — scanner submits automatically"
          aria-label="Scan QR code or enter asset tag"
        /><input value={observedLocation} onChange={e => setObservedLocation(e.target.value)} placeholder="Observed location (optional)" /><button className="qr-primary" disabled={busy || !scanCode.trim()}>Record scan</button></form>
      </div>}
      <div className="qr-result-grid"><div><h3>Scanned assets ({detail.scans.length})</h3><div className="qr-table-scroll"><table className="qr-table"><thead><tr><th>Asset tag</th><th>Expected location</th><th>Observed location</th><th>Scanned at</th></tr></thead><tbody>{detail.scans.length ? detail.scans.map(s => <tr key={s.id}><td><strong>{s.asset_tag}</strong><small>{s.asset_name || ""}</small></td><td>{s.expected_location || "—"}</td><td>{s.observed_location || "—"}</td><td>{s.scanned_at ? new Date(s.scanned_at).toLocaleString() : "—"}</td></tr>) : <tr><td colSpan="4" className="qr-empty">No assets scanned yet.</td></tr>}</tbody></table></div></div>
        <div><h3>Not scanned ({detail.missing_assets.length})</h3><div className="qr-table-scroll"><table className="qr-table"><thead><tr><th>Asset tag</th><th>Type</th><th>Location</th></tr></thead><tbody>{detail.missing_assets.length ? detail.missing_assets.map(a => <tr key={a.id}><td><strong>{a.asset_tag}</strong><small>{a.status}</small></td><td>{a.asset_type || "—"}</td><td>{a.location || "—"}</td></tr>) : <tr><td colSpan="3" className="qr-empty">All registered assets were scanned.</td></tr>}</tbody></table></div></div></div>
      {detail.item.status === "COMPLETED" && <div className="qr-completed-note"><ShieldCheck size={18} /> This audit is completed. Its scan and missing-asset report is read-only.</div>}
    </section>}

    {confirmComplete && <div className="qr-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && setConfirmComplete(false)}>
      <div className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-complete-title">
        <div className="qr-modal-head">
          <div><h2 id="qr-complete-title">Complete this physical audit?</h2><p>No more scans can be added after the audit is completed.</p></div>
          <button type="button" className="qr-icon-button" aria-label="Close" onClick={() => setConfirmComplete(false)}><X /></button>
        </div>
        <div className="qr-modal-actions">
          <button type="button" className="qr-secondary" onClick={() => setConfirmComplete(false)}>Cancel</button>
          <button type="button" className="qr-primary" disabled={busy} onClick={confirmCompleteAudit}>{busy ? "Completing…" : "Complete audit"}</button>
        </div>
      </div>
    </div>}

    {showCreate && <div className="qr-overlay" onMouseDown={e => e.target === e.currentTarget && setShowCreate(false)}><form className="qr-modal" onSubmit={createAudit}><div className="qr-modal-head"><div><h2>Create physical audit</h2><p>Set up an inventory check for a location or the whole company.</p></div><button type="button" className="qr-icon-button" onClick={() => setShowCreate(false)}><X /></button></div><label>Audit name<input required maxLength="160" value={form.name} onChange={e => setForm(o => ({ ...o, name: e.target.value }))} placeholder="October 2026 asset audit" /></label><label>Location / department<input value={form.location} onChange={e => setForm(o => ({ ...o, location: e.target.value }))} placeholder="e.g. Bengaluru office / IT department" /></label><label>Notes<textarea rows="3" value={form.notes} onChange={e => setForm(o => ({ ...o, notes: e.target.value }))} placeholder="Optional audit instructions" /></label><div className="qr-modal-actions"><button type="button" className="qr-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="qr-primary" disabled={busy}>{busy ? "Creating…" : "Create audit"}</button></div></form></div>}
  </section>;
}
