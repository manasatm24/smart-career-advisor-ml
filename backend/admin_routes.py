# backend/admin_routes.py
from flask import Blueprint, request, jsonify
from models import db, Career, Job, Admin, LoginLog, User
from werkzeug.security import generate_password_hash, check_password_hash
import secrets


admin_bp = Blueprint('admin_bp', __name__)

# Create default admin (run once) - for demo purposes
@admin_bp.route('/init', methods=['POST'])
def init_admin():
    data = request.get_json() or {}
    username = data.get('username', 'admin')
    password = data.get('password', 'admin123')
    if Admin.query.filter_by(username=username).first():
        return jsonify({"message":"admin already exists"}), 200
    a = Admin(username=username, password=generate_password_hash(password))
    db.session.add(a); db.session.commit()
    return jsonify({"message":"admin created","username":username}), 201

# Login -> returns a simple token (stored in DB for demo)
@admin_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username'); password = data.get('password')
    if not username or not password:
        return jsonify({"error":"username/password required"}), 400
    admin = Admin.query.filter_by(username=username).first()
    if not admin or not check_password_hash(admin.password, password):
        return jsonify({"error":"invalid credentials"}), 401
    # generate token (simple)
    token = secrets.token_hex(16)
    admin.token = token
    db.session.commit()
    return jsonify({"token":token}), 200

# decorator-like check (simple) - can be used in other routes
def get_admin_from_request(req):
    token = req.headers.get("X-Admin-Token")
    if not token:
        return None
    return Admin.query.filter_by(token=token).first()


def require_token(req):
    return get_admin_from_request(req) is not None


def _serialize_login_log(log_entry):
    timestamp = None
    if log_entry.timestamp is not None:
        timestamp = log_entry.timestamp.isoformat(timespec="seconds") + "Z"

    return {
        "id": log_entry.id,
        "username": log_entry.username,
        "action": log_entry.action,
        "timestamp": timestamp,
    }


@admin_bp.route('/logout', methods=['POST'])
def logout_admin():
    admin = get_admin_from_request(request)
    if admin is None:
        return jsonify({"error":"unauthorized"}), 401

    admin.token = None
    db.session.commit()
    return jsonify({"message":"logout successful"}), 200

# CRUD - add career
@admin_bp.route('/careers', methods=['POST'])
def add_career():
    if not require_token(request): return jsonify({"error":"unauthorized"}), 401
    data = request.get_json() or {}
    career = Career(branch=data.get('branch',''), role=data.get('role',''), required_skills=",".join(data.get('skills',[])), description=data.get('description',''))
    db.session.add(career); db.session.commit()
    return jsonify({"message":"career added","id":career.id}), 201

# List careers
@admin_bp.route('/careers', methods=['GET'])
def list_careers():
    if not require_token(request): return jsonify({"error":"unauthorized"}), 401
    rows = Career.query.all()
    out = [{"id":r.id,"branch":r.branch,"role":r.role,"skills":r.required_skills,"description":r.description} for r in rows]
    return jsonify(out), 200

# Delete career
@admin_bp.route('/careers/<int:career_id>', methods=['DELETE'])
def delete_career(career_id):
    if not require_token(request): return jsonify({"error":"unauthorized"}), 401
    career = Career.query.get(career_id)
    if not career:
        return jsonify({"error":"career not found"}), 404
    db.session.delete(career)
    db.session.commit()
    return jsonify({"message":"career deleted"}), 200

# Add job
@admin_bp.route('/jobs', methods=['POST'])
def add_job():
    if not require_token(request): return jsonify({"error":"unauthorized"}), 401
    data = request.get_json() or {}
    job = Job(company=data.get('company',''), role=data.get('role',''), location=data.get('location',''), eligibility=data.get('eligibility',''), salary=data.get('salary',''))
    db.session.add(job); db.session.commit()
    return jsonify({"message":"job added","id":job.id}), 201

# List jobs
@admin_bp.route('/jobs', methods=['GET'])
def list_jobs():
    if not require_token(request): return jsonify({"error":"unauthorized"}), 401
    rows = Job.query.all()
    out = [{"id":r.id,"company":r.company,"role":r.role,"location":r.location,"salary":r.salary} for r in rows]
    return jsonify(out), 200

# Delete job
@admin_bp.route('/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    if not require_token(request): return jsonify({"error":"unauthorized"}), 401
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error":"job not found"}), 404
    db.session.delete(job)
    db.session.commit()
    return jsonify({"message":"job deleted"}), 200

# Get statistics (public endpoint for dashboard)
@admin_bp.route('/statistics', methods=['GET'])
def get_statistics():
    try:
        total_users = User.query.count()
        active_sessions = Admin.query.filter(Admin.token.isnot(None)).count()
        
        return jsonify({
            "total_users": total_users,
            "active_sessions": active_sessions
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/login-logs', methods=['GET'])
def list_login_logs():
    if not require_token(request):
        return jsonify({"error":"unauthorized"}), 401

    try:
        rows = (
            LoginLog.query.order_by(LoginLog.timestamp.desc(), LoginLog.id.desc())
            .limit(50)
            .all()
        )
        return jsonify([_serialize_login_log(row) for row in rows]), 200
    except Exception as error:
        return jsonify({"error": str(error)}), 500
