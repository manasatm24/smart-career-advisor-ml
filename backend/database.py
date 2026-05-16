import json
import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "smart-career-advisor" / "smart-c-advisor"
DATA_DIR = FRONTEND_DIR / "data"
DEFAULT_DB_PATH = BASE_DIR / "career_advisor.db"
LEGACY_DB_PATH = BASE_DIR / "database" / "career_advisor.db"


def get_database_uri():
    configured_uri = os.getenv("SCA_DATABASE_URI")
    if configured_uri:
        return configured_uri

    return f"sqlite:///{DEFAULT_DB_PATH.resolve().as_posix()}"


def get_frontend_dir():
    return str(FRONTEND_DIR.resolve())


def get_data_file_path(filename):
    return DATA_DIR / filename


def load_json_data(filename):
    file_path = get_data_file_path(filename)
    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)
