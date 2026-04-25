from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv, find_dotenv
import os

# Load environment variables from the nearest .env file.
# Use utf-8-sig so files saved with UTF-8 BOM still parse correctly.
dotenv_path = find_dotenv()
load_dotenv(dotenv_path=dotenv_path, encoding="utf-8-sig")

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Check to ensure the URL was loaded
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()