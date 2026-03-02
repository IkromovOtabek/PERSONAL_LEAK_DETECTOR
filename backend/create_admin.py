"""
Script to create admin user.
Usage: python create_admin.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import get_password_hash

def create_admin():
    """Create admin user with email 'admin@example.com' and password 'admin123'."""
    db = SessionLocal()
    
    try:
        admin_email = "admin@example.com"
        
        # Check if admin already exists
        admin = db.query(User).filter(User.email == admin_email).first()
        if admin:
            print("Admin user already exists!")
            if admin.is_admin:
                print(f"Admin user: {admin.email} (ID: {admin.id})")
                print(f"Is admin: {admin.is_admin}")
                return admin
            else:
                # Update existing user to admin
                admin.is_admin = True
                admin.is_active = True
                admin.is_verified = True
                db.commit()
                print(f"Updated user '{admin.email}' to admin")
                return admin
        
        # Check if old "admin" user exists and update it
        old_admin = db.query(User).filter(User.email == "admin").first()
        if old_admin:
            print(f"Found old admin user with email 'admin', updating to '{admin_email}'...")
            old_admin.email = admin_email
            old_admin.is_admin = True
            old_admin.is_active = True
            old_admin.is_verified = True
            db.commit()
            db.refresh(old_admin)
            print(f"Updated old admin user to '{admin_email}'")
            return old_admin
        
        # Create new admin user
        hashed_password = get_password_hash("admin123")
        admin = User(
            email=admin_email,
            password_hash=hashed_password,
            is_admin=True,
            is_active=True,
            is_verified=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("Admin user created successfully!")
        print(f"Email: {admin.email}")
        print(f"Password: admin123")
        print(f"ID: {admin.id}")
        print(f"Is admin: {admin.is_admin}")
        
        return admin
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    create_admin()

