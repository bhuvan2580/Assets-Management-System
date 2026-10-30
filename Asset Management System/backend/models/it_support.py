from datetime import datetime
from extensions import db

class ITRequest(db.Model):
    __tablename__ = 'it_requests'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(180), nullable=False)
    category = db.Column(db.String(40), nullable=False, default='OTHER')
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), nullable=False, default='MEDIUM')
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(30), nullable=False, default='SUBMITTED', index=True)
    review_notes = db.Column(db.Text)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    employee = db.relationship('Employee')
    asset = db.relationship('Asset')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('it_requests.id', ondelete='RESTRICT'), nullable=False, unique=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(40), nullable=False)
    priority = db.Column(db.String(20), nullable=False, default='MEDIUM')
    status = db.Column(db.String(30), nullable=False, default='OPEN', index=True)
    resolution_notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    request = db.relationship('ITRequest', backref=db.backref('ticket', uselist=False))
    assignee = db.relationship('User', foreign_keys=[assigned_to])
    creator = db.relationship('User', foreign_keys=[created_by])

class ITRequestHistory(db.Model):
    __tablename__ = 'it_request_history'
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('it_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    actor_type = db.Column(db.String(20), nullable=False)
    actor_id = db.Column(db.Integer)
    action = db.Column(db.String(40), nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
