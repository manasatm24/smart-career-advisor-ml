import os
from urllib.parse import quote_plus

import requests
from flask import Blueprint, jsonify, request

from database import load_json_data
from models import Job, db


job_bp = Blueprint("job_bp", __name__)


def _get_payload():
    return request.get_json(silent=True) or {}


def _serialize_job(job):
    return {
        "id": job.id,
        "company": job.company,
        "role": job.role,
        "location": job.location,
        "eligibility": job.eligibility,
        "salary": job.salary,
        "posted_on": job.posted_on.isoformat() if job.posted_on else None,
    }


def _matches_search(job, skill, location):
    normalized_skill = (skill or "").strip().lower()
    normalized_location = (location or "").strip().lower()
    search_text = " ".join(
        [
            job.get("role", ""),
            " ".join(job.get("skills", [])),
            job.get("company", ""),
        ]
    ).lower()

    if normalized_skill:
        tokens = [token for token in normalized_skill.replace("/", " ").split() if len(token) >= 2]
        if tokens and not any(token in search_text for token in tokens):
            return False

    if normalized_location and normalized_location not in job.get("location", "").lower():
        return False

    return True


def _load_local_job_matches(skill, location):
    try:
        companies = load_json_data("jobs.json")
    except (FileNotFoundError, OSError, ValueError):
        return []

    matches = []
    for company in companies:
        company_name = company.get("company", "Company")
        for job in company.get("job_roles", []):
            candidate = {
                "company": company_name,
                "role": job.get("role", "Role"),
                "location": job.get("location", ""),
                "skills": job.get("skills", []),
            }
            if not _matches_search(candidate, skill, location):
                continue

            query = quote_plus(
                f"{company_name} {candidate['role']} jobs {candidate['location']}"
            )
            matches.append(
                {
                    "title": candidate["role"],
                    "company": company_name,
                    "location": candidate["location"],
                    "url": f"https://www.google.com/search?q={query}",
                }
            )

    return matches[:25]


@job_bp.route("/jobs/live", methods=["POST"])
def get_live_jobs():
    data = _get_payload()
    skill = data.get("skill", "")
    location = data.get("location", "")

    if not skill:
        return jsonify({"error": "Please provide a skill or preferred role"}), 400

    api_key = os.getenv("RAPIDAPI_KEY")
    if not api_key:
        return jsonify(_load_local_job_matches(skill, location)), 200

    url = (
        "https://jsearch.p.rapidapi.com/search?"
        f"query={quote_plus(skill)}+jobs+in+{quote_plus(location or 'India')}"
    )
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": os.getenv("RAPIDAPI_HOST", "jsearch.p.rapidapi.com"),
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        job_data = response.json()

        jobs = []
        for job in job_data.get("data", []):
            jobs.append(
                {
                    "title": job.get("job_title"),
                    "company": job.get("employer_name"),
                    "location": job.get("job_city"),
                    "url": job.get("job_apply_link"),
                }
            )

        return jsonify(jobs), 200
    except Exception as error:
        fallback_jobs = _load_local_job_matches(skill, location)
        if fallback_jobs:
            return jsonify(fallback_jobs), 200
        return jsonify({"error": f"Failed to fetch jobs: {str(error)}"}), 500


@job_bp.route("/jobs/local", methods=["GET"])
def get_local_jobs():
    jobs = Job.query.order_by(Job.posted_on.desc(), Job.id.desc()).all()
    return jsonify([_serialize_job(job) for job in jobs]), 200


@job_bp.route("/admin/add_job", methods=["POST"])
def add_job():
    data = _get_payload()
    title = data.get("title") or data.get("role")
    company = data.get("company")
    location = data.get("location", "")
    description = data.get("description") or data.get("eligibility", "")
    salary = data.get("salary", "")

    if not title or not company:
        return jsonify({"error": "Missing title or company"}), 400

    job = Job(
        company=company,
        role=title,
        location=location,
        eligibility=description,
        salary=salary,
    )
    db.session.add(job)
    db.session.commit()

    return jsonify({"message": "Job added successfully!", "id": job.id}), 201


@job_bp.route("/job_logs", methods=["GET"])
def get_job_logs():
    try:
        local_job_count = len(load_json_data("jobs.json"))
        logs = [
            f"RapidAPI configured: {'yes' if os.getenv('RAPIDAPI_KEY') else 'no'}",
            f"Stored admin job entries: {Job.query.count()}",
            f"Local job catalog loaded: {local_job_count} companies",
        ]
        return jsonify(logs), 200
    except Exception as error:
        return jsonify({"error": str(error)}), 500
