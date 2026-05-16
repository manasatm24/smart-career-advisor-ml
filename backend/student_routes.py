from flask import Blueprint, jsonify, request

from models import Career, Job


student_bp = Blueprint("student_bp", __name__)


def _split_skills(skill_string):
    if not skill_string:
        return []
    return [skill.strip() for skill in skill_string.split(",") if skill.strip()]


@student_bp.route("/careers", methods=["GET"])
def get_careers():
    careers = Career.query.all()
    result = [
        {
            "id": career.id,
            "branch": career.branch,
            "career": career.role,
            "skills": _split_skills(career.required_skills),
            "description": career.description,
        }
        for career in careers
    ]
    return jsonify(result)


@student_bp.route("/jobs", methods=["POST"])
def recommend_jobs():
    data = request.get_json(silent=True) or {}
    skills = [skill.lower() for skill in data.get("skills", []) if skill]

    results = []
    for job in Job.query.all():
        searchable_text = " ".join(
            filter(None, [job.company, job.role, job.location, job.eligibility, job.salary])
        ).lower()
        if skills and not any(skill in searchable_text for skill in skills):
            continue

        results.append(
            {
                "company": job.company,
                "role": job.role,
                "location": job.location,
                "eligibility": job.eligibility,
                "salary": job.salary,
            }
        )

    return jsonify(results)
