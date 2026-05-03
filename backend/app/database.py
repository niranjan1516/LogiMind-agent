import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Connects to the Docker DB internally, or localhost if run outside Docker
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://logimind_admin:admin_password@localhost:5432/logimind"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()