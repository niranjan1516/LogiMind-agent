import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Connects to the Docker DB internally, or localhost if run outside Docker
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://logimind_admin:admin_password@localhost:5432/logimind"
)

# Neon requires sslmode=require, which sometimes conflicts with SQLAlchemy, so we format it safely:
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    # Fallback to Neon hardcoded string ONLY if both environment and local fail
    SQLALCHEMY_DATABASE_URL or "postgresql://neondb_owner:npg_ucZbPS41JAUK@ep-floral-mud-ap3xtwgz.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require",
    pool_size=20,          # Keep 20 connections open and ready
    max_overflow=10,       # Allow up to 10 extra if traffic spikes
    pool_timeout=30,       # Wait 30s for a connection before failing
    pool_recycle=1800,     # Refresh connections every 30 mins
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
    
# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 
