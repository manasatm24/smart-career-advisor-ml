from flask import Blueprint, jsonify, request

from models import Feedback, db


feedback_bp = Blueprint("feedback_bp", __name__)


def _serialize_feedback(feedback):
    return {
        "id": feedback.id,
        "user_name": feedback.name,
        "email": feedback.email,
        "comments": feedback.message,
        "rating": 5,
    }


@feedback_bp.route("/feedback", methods=["POST"])
def add_feedback():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        email = data.get("email")
        message = data.get("message")

        if not name or not email or not message:
            return jsonify({"error": "All fields are required"}), 400

        db.session.add(Feedback(name=name, email=email, message=message))
        db.session.commit()

        return jsonify({"message": "Feedback submitted successfully!"}), 201
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": str(error)}), 500


@feedback_bp.route("/get_feedback", methods=["GET"])
def get_feedback():
    try:
        feedback_entries = (
            Feedback.query.order_by(Feedback.date_submitted.desc(), Feedback.id.desc()).all()
        )
        return jsonify([_serialize_feedback(entry) for entry in feedback_entries]), 200
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@feedback_bp.route("/delete_feedback/<int:feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    try:
        feedback = db.session.get(Feedback, feedback_id)
        if feedback is None:
            return jsonify({"error": "Feedback not found"}), 404

        db.session.delete(feedback)
        db.session.commit()

        return jsonify({"message": "Feedback deleted successfully!"}), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": str(error)}), 500
