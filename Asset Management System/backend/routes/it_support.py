from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models.employee import Employee
from models.user import User
from models.asset import Asset
from models.it_support import ITRequest, SupportTicket, ITRequestHistory

it_support_bp = Blueprint('it_support', __name__, url_prefix='/api/it-support')
ADMIN_ROLES = {'SUPERUSER', 'ADMIN', 'IT'}
CATEGORIES = {'HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS', 'OTHER'}
PRIORITIES = {'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'}
REQUEST_STATUSES = {'SUBMITTED', 'UNDER_REVIEW', 'INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'TICKET_CREATED'}
TICKET_STATUSES = {'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'}

def actor():
    claims = get_jwt() or {}
    typ = (claims.get('account_type') or '').upper()
    raw_id = claims.get('account_id')
    role = (claims.get('role') or '').upper()
    if not raw_id:
        identity = str(__import__('flask_jwt_extended').get_jwt_identity() or '')
        try: typ, raw_id = identity.split(':', 1)
        except ValueError: return typ, None, role
    try: raw_id = int(raw_id)
    except (TypeError, ValueError): return typ, None, role
    if typ == 'EMPLOYEE':
        return typ, db.session.get(Employee, raw_id), 'EMPLOYEE'
    return typ, db.session.get(User, raw_id), role

def serialize_request(r):
    return {'id':r.id,'title':r.title,'category':r.category,'description':r.description,'priority':r.priority,'asset_id':r.asset_id,'asset_tag':r.asset.asset_tag if r.asset else None,'status':r.status,'review_notes':r.review_notes,'employee_id':r.employee_id,'employee_name':r.employee.name if r.employee else None,'employee_email':r.employee.email if r.employee else None,'reviewed_by':r.reviewer.name if r.reviewer else None,'created_at':r.created_at.isoformat() if r.created_at else None,'updated_at':r.updated_at.isoformat() if r.updated_at else None,'ticket_id':r.ticket.id if getattr(r,'ticket',None) else None}

def serialize_ticket(t):
    req=t.request
    return {'id':t.id,'request_id':t.request_id,'title':t.title,'description':t.description,'category':t.category,'priority':t.priority,'status':t.status,'resolution_notes':t.resolution_notes,'assigned_to':t.assigned_to,'assignee_name':t.assignee.name if t.assignee else None,'employee_name':req.employee.name if req and req.employee else None,'employee_id':req.employee_id if req else None,'created_at':t.created_at.isoformat() if t.created_at else None}

def add_history(r, typ, ident, action, notes=None):
    db.session.add(ITRequestHistory(request_id=r.id, actor_type=typ, actor_id=ident, action=action, notes=notes))

@it_support_bp.route('/requests', methods=['GET','POST'])
@jwt_required()
def requests_collection():
    typ, obj, role = actor()
    if not obj: return jsonify(message='Account not found.'), 401
    if request.method == 'POST':
        if typ != 'EMPLOYEE' or not isinstance(obj, Employee): return jsonify(message='Only employees can submit IT requests.'), 403
        data=request.get_json(silent=True) or {}
        title=str(data.get('title','')).strip(); description=str(data.get('description','')).strip()
        category=str(data.get('category','OTHER')).upper(); priority=str(data.get('priority','MEDIUM')).upper()
        if not title or not description: return jsonify(message='Title and description are required.'), 400
        if category not in CATEGORIES or priority not in PRIORITIES: return jsonify(message='Invalid category or priority.'), 400
        asset_id=data.get('asset_id') or None
        if asset_id:
            asset=db.session.get(Asset, asset_id)
            if not asset: return jsonify(message='Selected asset was not found.'), 404
            # Only allow a linked asset if it is assigned to this employee.
            from models.assignment import AssetAssignment
            assignment=AssetAssignment.query.filter_by(employee_id=obj.id, original_asset_id=asset.id).filter(AssetAssignment.actual_return_date.is_(None)).first()
            if not assignment: return jsonify(message='You can only link an asset currently assigned to you.'), 403
        r=ITRequest(employee_id=obj.id,title=title,description=description,category=category,priority=priority,asset_id=asset_id)
        db.session.add(r); db.session.flush(); add_history(r,'EMPLOYEE',obj.id,'SUBMITTED')
        db.session.commit(); return jsonify(item=serialize_request(r),message='IT request submitted for review.'),201
    q=ITRequest.query
    if typ == 'EMPLOYEE' and isinstance(obj, Employee): q=q.filter_by(employee_id=obj.id)
    elif role not in ADMIN_ROLES: return jsonify(message='You do not have permission to view all IT requests.'),403
    rows=q.order_by(ITRequest.created_at.desc()).all()
    return jsonify(items=[serialize_request(x) for x in rows]),200

@it_support_bp.route('/requests/<int:rid>/review', methods=['PATCH'])
@jwt_required()
def review_request(rid):
    typ,obj,role=actor()
    if typ != 'USER' or not isinstance(obj,User) or obj.role not in ADMIN_ROLES: return jsonify(message='Only IT Admins and Superusers can review requests.'),403
    r=db.session.get(ITRequest,rid)
    if not r: return jsonify(message='Request not found.'),404
    data=request.get_json(silent=True) or {}; status=str(data.get('status','')).upper(); notes=str(data.get('notes','')).strip()
    if status not in {'UNDER_REVIEW','INFORMATION_REQUIRED','APPROVED','REJECTED'}: return jsonify(message='Invalid review status.'),400
    if status in {'REJECTED','INFORMATION_REQUIRED'} and not notes: return jsonify(message='Please provide a reason or details for the employee.'),400
    if r.status in {'TICKET_CREATED','REJECTED'}: return jsonify(message='This request can no longer be reviewed.'),409
    r.status=status; r.review_notes=notes or None; r.reviewed_by=obj.id; r.reviewed_at=datetime.utcnow(); add_history(r,'USER',obj.id,status,notes); db.session.commit()
    return jsonify(item=serialize_request(r),message='Request review updated.'),200

@it_support_bp.route('/requests/<int:rid>/create-ticket', methods=['POST'])
@jwt_required()
def create_ticket(rid):
    typ,obj,role=actor()
    if typ != 'USER' or not isinstance(obj,User) or obj.role not in ADMIN_ROLES: return jsonify(message='Only IT Admins and Superusers can create official tickets.'),403
    r=db.session.get(ITRequest,rid)
    if not r: return jsonify(message='Request not found.'),404
    if r.status not in {'APPROVED','UNDER_REVIEW'}: return jsonify(message='Approve or review the request before creating a ticket.'),409
    if getattr(r,'ticket',None): return jsonify(message='A ticket already exists for this request.'),409
    data=request.get_json(silent=True) or {}
    title=str(data.get('title') or r.title).strip(); description=str(data.get('description') or r.description).strip()
    priority=str(data.get('priority') or r.priority).upper(); assigned_to=data.get('assigned_to') or None
    if priority not in PRIORITIES: return jsonify(message='Invalid priority.'),400
    if assigned_to:
        assignee=db.session.get(User,assigned_to)
        if not assignee or assignee.role not in ADMIN_ROLES: return jsonify(message='Selected assignee is invalid.'),400
    t=SupportTicket(request_id=r.id,title=title,description=description,category=r.category,priority=priority,assigned_to=assigned_to,created_by=obj.id,status='ASSIGNED' if assigned_to else 'OPEN')
    db.session.add(t); r.status='TICKET_CREATED'; r.reviewed_by=obj.id; r.reviewed_at=datetime.utcnow(); add_history(r,'USER',obj.id,'TICKET_CREATED',f'Official ticket created'); db.session.commit()
    return jsonify(item=serialize_ticket(t),message='Official support ticket created.'),201

@it_support_bp.route('/tickets', methods=['GET'])
@jwt_required()
def list_tickets():
    typ,obj,role=actor()
    q=SupportTicket.query.join(ITRequest)
    if typ == 'EMPLOYEE' and isinstance(obj,Employee): q=q.filter(ITRequest.employee_id==obj.id)
    elif role not in ADMIN_ROLES: return jsonify(message='You do not have permission to view all tickets.'),403
    return jsonify(items=[serialize_ticket(t) for t in q.order_by(SupportTicket.created_at.desc()).all()]),200

@it_support_bp.route('/tickets/<int:tid>', methods=['PATCH'])
@jwt_required()
def update_ticket(tid):
    typ,obj,role=actor()
    if typ != 'USER' or not isinstance(obj,User) or obj.role not in ADMIN_ROLES: return jsonify(message='Only IT Admins and Superusers can update tickets.'),403
    t=db.session.get(SupportTicket,tid)
    if not t: return jsonify(message='Ticket not found.'),404
    data=request.get_json(silent=True) or {}
    if 'status' in data:
        status=str(data['status']).upper()
        if status not in TICKET_STATUSES: return jsonify(message='Invalid ticket status.'),400
        t.status=status
    if 'priority' in data:
        priority=str(data['priority']).upper()
        if priority not in PRIORITIES: return jsonify(message='Invalid priority.'),400
        t.priority=priority
    if 'assigned_to' in data:
        val=data['assigned_to'] or None
        if val and not db.session.get(User,val): return jsonify(message='Assignee not found.'),404
        t.assigned_to=val
        if val and t.status=='OPEN': t.status='ASSIGNED'
    if 'resolution_notes' in data: t.resolution_notes=str(data['resolution_notes']).strip() or None
    db.session.commit(); return jsonify(item=serialize_ticket(t),message='Ticket updated.'),200
