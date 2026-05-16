from flask import Blueprint, jsonify

from database import load_json_data


career_bp = Blueprint("career_bp", __name__)


@career_bp.route("/career", methods=["GET"])
def get_career_data():
    try:
        return jsonify(load_json_data("careers.json")), 200
    except FileNotFoundError:
        return jsonify({"error": "careers.json not found"}), 404
    except Exception as error:
        return jsonify({"error": str(error)}), 500
