import os
import uuid
import datetime
from typing import List, Optional, Any
from sqlalchemy import create_engine, Column, String, Text, Boolean, DateTime, JSON, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Get Database URL from environment; fallback to local SQLite for smooth offline/development workflow
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./stockweb.db"

# Handle postgres:// vs postgresql:// protocol if provided by certain cloud providers (like Supabase/Render)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String(30), unique=True, index=True, nullable=False) # e.g. "2330.TW", "NVDA"
    name = Column(String(100), nullable=True)                          # e.g. "台積電", "NVIDIA Corp"
    market = Column(String(10), index=True, default="TW")              # "TW" or "US"
    sector = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class StockNote(Base):
    __tablename__ = "stock_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol = Column(String(30), index=True, nullable=False)
    market = Column(String(10), default="TW")
    author = Column(String(50), default="Anonymous")
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)                            # Markdown content
    tags = Column(JSON, default=list)                                 # List of string tags, e.g. ["波段多", "主力籌碼"]
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ChartDrawing(Base):
    __tablename__ = "chart_drawings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol = Column(String(30), index=True, nullable=False)
    user_id = Column(String(50), default="User")
    drawing_data = Column(JSON, nullable=False)                       # Array/Object of overlays, lines, fibonacci coordinates
    is_public = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_direction = Column(String(20), nullable=False)               # "cloud_to_local", "local_to_cloud", "bidirectional"
    status = Column(String(20), nullable=False)                      # "success", "partial", "failed"
    synced_notes_count = Column(Integer, default=0)
    synced_drawings_count = Column(Integer, default=0)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
