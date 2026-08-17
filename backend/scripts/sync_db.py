"""
PostgreSQL Cloud <-> Local Bi-directional Sync Engine
======================================================
This script allows syncing stock notes and chart drawings between a cloud PostgreSQL
(e.g., Supabase / Neon / Render) and a local PostgreSQL / SQLite database.
"""

import os
import sys
import datetime
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add parent directory to sys.path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.database import Base, StockNote, ChartDrawing, SyncLog

load_dotenv()

CLOUD_DB_URL = os.getenv("CLOUD_DATABASE_URL")
LOCAL_DB_URL = os.getenv("LOCAL_DATABASE_URL", "sqlite:///./stockweb.db")

def get_engine(url: str):
    if not url:
        return None
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)

def sync_tables():
    print(f"[{datetime.datetime.now()}] Starting Database Synchronization...")
    print(f"Local DB Target: {LOCAL_DB_URL}")
    print(f"Cloud DB Target: {CLOUD_DB_URL or 'Not configured (using Local standalone)'}")

    if not CLOUD_DB_URL:
        print("[WARN] CLOUD_DATABASE_URL is not set in .env. Skipping cloud sync.")
        return

    cloud_engine = get_engine(CLOUD_DB_URL)
    local_engine = get_engine(LOCAL_DB_URL)

    # Initialize tables on both ends if needed
    Base.metadata.create_all(bind=cloud_engine)
    Base.metadata.create_all(bind=local_engine)

    CloudSession = sessionmaker(bind=cloud_engine)
    LocalSession = sessionmaker(bind=local_engine)

    cloud_session = CloudSession()
    local_session = LocalSession()

    synced_notes = 0
    synced_drawings = 0

    try:
        # 1. Sync StockNotes
        cloud_notes = {n.id: n for n in cloud_session.query(StockNote).all()}
        local_notes = {n.id: n for n in local_session.query(StockNote).all()}

        # Cloud -> Local & Local -> Cloud reconciliation
        all_note_ids = set(cloud_notes.keys()).union(set(local_notes.keys()))

        for nid in all_note_ids:
            c_note = cloud_notes.get(nid)
            l_note = local_notes.get(nid)

            if c_note and not l_note:
                # Cloud has it, Local does not -> Copy to Local
                new_l_note = StockNote(
                    id=c_note.id, symbol=c_note.symbol, market=c_note.market,
                    author=c_note.author, title=c_note.title, content=c_note.content,
                    tags=c_note.tags, is_deleted=c_note.is_deleted,
                    created_at=c_note.created_at, updated_at=c_note.updated_at
                )
                local_session.add(new_l_note)
                synced_notes += 1
            elif l_note and not c_note:
                # Local has it, Cloud does not -> Copy to Cloud
                new_c_note = StockNote(
                    id=l_note.id, symbol=l_note.symbol, market=l_note.market,
                    author=l_note.author, title=l_note.title, content=l_note.content,
                    tags=l_note.tags, is_deleted=l_note.is_deleted,
                    created_at=l_note.created_at, updated_at=l_note.updated_at
                )
                cloud_session.add(new_c_note)
                synced_notes += 1
            elif c_note and l_note:
                # Both have it -> Keep newest updated_at
                c_up = c_note.updated_at or c_note.created_at
                l_up = l_note.updated_at or l_note.created_at
                if c_up > l_up:
                    # Update local
                    l_note.title = c_note.title
                    l_note.content = c_note.content
                    l_note.tags = c_note.tags
                    l_note.is_deleted = c_note.is_deleted
                    l_note.updated_at = c_note.updated_at
                    synced_notes += 1
                elif l_up > c_up:
                    # Update cloud
                    c_note.title = l_note.title
                    c_note.content = l_note.content
                    c_note.tags = l_note.tags
                    c_note.is_deleted = l_note.is_deleted
                    c_note.updated_at = l_note.updated_at
                    synced_notes += 1

        # 2. Sync ChartDrawings
        cloud_drawings = {d.id: d for d in cloud_session.query(ChartDrawing).all()}
        local_drawings = {d.id: d for d in local_session.query(ChartDrawing).all()}
        all_drawing_ids = set(cloud_drawings.keys()).union(set(local_drawings.keys()))

        for did in all_drawing_ids:
            c_draw = cloud_drawings.get(did)
            l_draw = local_drawings.get(did)

            if c_draw and not l_draw:
                new_l_draw = ChartDrawing(
                    id=c_draw.id, symbol=c_draw.symbol, user_id=c_draw.user_id,
                    drawing_data=c_draw.drawing_data, is_public=c_draw.is_public,
                    is_deleted=c_draw.is_deleted, created_at=c_draw.created_at,
                    updated_at=c_draw.updated_at
                )
                local_session.add(new_l_draw)
                synced_drawings += 1
            elif l_draw and not c_draw:
                new_c_draw = ChartDrawing(
                    id=l_draw.id, symbol=l_draw.symbol, user_id=l_draw.user_id,
                    drawing_data=l_draw.drawing_data, is_public=l_draw.is_public,
                    is_deleted=l_draw.is_deleted, created_at=l_draw.created_at,
                    updated_at=l_draw.updated_at
                )
                cloud_session.add(new_c_draw)
                synced_drawings += 1
            elif c_draw and l_draw:
                c_up = c_draw.updated_at or c_draw.created_at
                l_up = l_draw.updated_at or l_draw.created_at
                if c_up > l_up:
                    l_draw.drawing_data = c_draw.drawing_data
                    l_draw.is_public = c_draw.is_public
                    l_draw.is_deleted = c_draw.is_deleted
                    l_draw.updated_at = c_draw.updated_at
                    synced_drawings += 1
                elif l_up > c_up:
                    c_draw.drawing_data = l_draw.drawing_data
                    c_draw.is_public = l_draw.is_public
                    c_draw.is_deleted = l_draw.is_deleted
                    c_draw.updated_at = l_draw.updated_at
                    synced_drawings += 1

        cloud_session.commit()
        local_session.commit()

        # Log synchronization
        log = SyncLog(
            sync_direction="bidirectional",
            status="success",
            synced_notes_count=synced_notes,
            synced_drawings_count=synced_drawings,
            details=f"Synced {synced_notes} notes and {synced_drawings} drawings."
        )
        local_session.add(log)
        local_session.commit()

        print(f"[SUCCESS] Sync completed! Synced {synced_notes} notes and {synced_drawings} drawings.")
    except Exception as e:
        cloud_session.rollback()
        local_session.rollback()
        print(f"[ERROR] Sync failed: {e}")
        raise e
    finally:
        cloud_session.close()
        local_session.close()

if __name__ == "__main__":
    sync_tables()
