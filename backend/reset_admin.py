from werkzeug.security import generate_password_hash

from app import app
from models import Admin, db


with app.app_context():
    db.create_all()

    admin = Admin.query.filter_by(username="admin").first()

    if admin:
        admin.password = generate_password_hash("admin123")
        admin.token = None
        print("Reset admin password to 'admin123' and cleared token.")
    else:
        db.session.add(
            Admin(
                username="admin",
                password=generate_password_hash("admin123"),
                token=None,
            )
        )
        print("Created admin user with password 'admin123'.")

    db.session.commit()
    print("Done. Start the backend and login with: admin / admin123")
