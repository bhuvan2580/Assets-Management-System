from datetime import datetime
from io import BytesIO

from flask import Blueprint, jsonify, request, send_file
from sqlalchemy import func
from flask_jwt_extended import get_jwt

from extensions import db
from models.asset import Asset
from models.asset_audit import AssetAuditSession, AssetAuditScan
from routes.auth import roles_required

qr_audits_bp = Blueprint("qr_audits", __name__, url_prefix="/api/qr-audits")


def _actor_name():
    claims = get_jwt() or {}
    return claims.get("name") or claims.get("email") or claims.get("role") or "Authenticated user"


def _session_dict(session):
    data = session.to_dict()
    data["expected_count"] = Asset.query.count()
    data["scanned_count"] = AssetAuditScan.query.filter_by(session_id=session.id).count()
    return data


@qr_audits_bp.route("/assets/<int:asset_id>/qr", methods=["GET"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def asset_qr(asset_id):
    asset = db.session.get(Asset, asset_id)
    if not asset:
        return jsonify({"message": "Asset not found."}), 404
    try:
        import qrcode
        from qrcode.constants import ERROR_CORRECT_M
    except ImportError:
        return jsonify({"message": "QR generation dependency is missing. Install backend requirements."}), 500
    payload = f"ASSET:{asset.asset_tag}"
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=10, border=3)
    qr.add_data(payload)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    safe_tag = "".join(ch for ch in asset.asset_tag if ch.isalnum() or ch in "-_") or str(asset.id)
    return send_file(output, mimetype="image/png", as_attachment=True, download_name=f"{safe_tag}-QR.png")


@qr_audits_bp.route("/sessions", methods=["GET"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def list_sessions():
    sessions = AssetAuditSession.query.order_by(AssetAuditSession.created_at.desc()).all()
    return jsonify({"items": [_session_dict(s) for s in sessions]}), 200


@qr_audits_bp.route("/sessions", methods=["POST"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def create_session():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"message": "Audit name is required."}), 400
    session = AssetAuditSession(name=name[:160], location=(data.get("location") or "").strip()[:150] or None,
                                notes=(data.get("notes") or "").strip() or None,
                                created_by=_actor_name())
    db.session.add(session)
    db.session.commit()
    return jsonify({"item": _session_dict(session), "message": "Physical audit created."}), 201


@qr_audits_bp.route("/sessions/<int:session_id>", methods=["GET"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def get_session(session_id):
    session = db.session.get(AssetAuditSession, session_id)
    if not session:
        return jsonify({"message": "Audit session not found."}), 404
    scans = AssetAuditScan.query.filter_by(session_id=session_id).order_by(AssetAuditScan.scanned_at.desc()).all()
    all_assets = Asset.query.order_by(Asset.asset_tag.asc()).all()
    scanned_ids = {scan.asset_id for scan in scans if scan.asset_id is not None}
    missing = [{"id": a.id, "asset_tag": a.asset_tag, "asset_type": a.asset_type, "location": a.location, "status": a.status}
               for a in all_assets if a.id not in scanned_ids]
    return jsonify({"item": _session_dict(session), "scans": [s.to_dict() for s in scans], "missing_assets": missing,
                    "summary": {"expected": len(all_assets), "scanned": len(scanned_ids), "missing": len(missing)}}), 200


@qr_audits_bp.route("/sessions/<int:session_id>/scan", methods=["POST"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def scan_asset(session_id):
    session = db.session.get(AssetAuditSession, session_id)
    if not session:
        return jsonify({"message": "Audit session not found."}), 404
    if session.status != "IN_PROGRESS":
        return jsonify({"message": "This audit is completed and cannot accept more scans."}), 409
    data = request.get_json(silent=True) or {}
    raw = (data.get("code") or data.get("asset_tag") or "").strip()
    tag = raw[6:].strip() if raw.upper().startswith("ASSET:") else raw
    if not tag:
        return jsonify({"message": "Scan a QR code or enter an asset tag."}), 400
    asset = Asset.query.filter(func.lower(Asset.asset_tag) == tag.lower()).first()
    if not asset:
        return jsonify({"message": f"No asset found for code '{tag}'."}), 404
    existing = AssetAuditScan.query.filter_by(session_id=session_id, asset_id=asset.id).first()
    if existing:
        return jsonify({"message": f"{asset.asset_tag} has already been scanned in this audit.", "item": existing.to_dict(), "duplicate": True}), 200
    scan = AssetAuditScan(session_id=session_id, asset_id=asset.id, asset_tag=asset.asset_tag,
                          asset_name=" ".join(filter(None, [asset.brand, asset.model])) or asset.asset_type,
                          expected_location=asset.location, observed_location=(data.get("observed_location") or "").strip()[:150] or None,
                          notes=(data.get("notes") or "").strip() or None, scanned_by=_actor_name())
    db.session.add(scan)
    db.session.commit()
    return jsonify({"item": scan.to_dict(), "asset": {"id": asset.id, "asset_tag": asset.asset_tag,
                    "asset_type": asset.asset_type, "brand": asset.brand, "model": asset.model,
                    "status": asset.status, "location": asset.location}, "message": f"Scanned {asset.asset_tag} successfully."}), 201


@qr_audits_bp.route("/sessions/<int:session_id>/complete", methods=["POST"])
@roles_required("SUPERUSER", "ADMIN", "IT")
def complete_session(session_id):
    session = db.session.get(AssetAuditSession, session_id)
    if not session:
        return jsonify({"message": "Audit session not found."}), 404
    session.status = "COMPLETED"
    session.completed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"item": _session_dict(session), "message": "Physical audit completed."}), 200
