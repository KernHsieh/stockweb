import os
import sys
import datetime
from typing import List, Optional, Dict, Any

# Ensure backend root is on sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.database import init_db, get_db, StockNote, ChartDrawing, SyncLog
from services.tw_stock import (
    get_tw_stock_info, get_tw_kline, get_tw_fundamentals, get_tw_chips, TW_STOCK_NAMES
)
from services.us_stock import (
    get_us_stock_info, get_us_kline, get_us_fundamentals, get_us_institutional, US_POPULAR_NAMES
)
from scripts.sync_db import sync_tables

# Initialize FastAPI App
app = FastAPI(
    title="Stock Analysis & Collaboration Platform API",
    description="Backend API for Taiwan & US Stocks with fundamentals, chips, TradingView charting data, notes, and cloud sync.",
    version="1.0.0"
)

# Enable CORS for frontend development and cloud deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database schema on startup
@app.on_event("startup")
def on_startup():
    init_db()

# ----------------- Pydantic Models -----------------
class NoteCreate(BaseModel):
    author: str = "Anonymous"
    title: str
    content: str
    tags: List[str] = []
    market: str = "TW"

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class DrawingSave(BaseModel):
    user_id: str = "User"
    drawing_data: Any
    is_public: bool = True

# ----------------- API Endpoints -----------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.datetime.utcnow().isoformat()}

@app.get("/api/stocks/search")
def search_stocks(q: str = Query("", description="Symbol or name keyword")):
    query = q.strip().upper()
    results = []

    # Match TW stocks
    for code, name in TW_STOCK_NAMES.items():
        if not query or query in code or query in name or query in f"{code}.TW":
            results.append({
                "symbol": f"{code}.TW",
                "name": name,
                "market": "TW",
                "display": f"{code} {name}"
            })

    # Match US stocks
    for sym, name in US_POPULAR_NAMES.items():
        if not query or query in sym or query in name.upper():
            results.append({
                "symbol": sym,
                "name": name,
                "market": "US",
                "display": f"{sym} ({name})"
            })

    # Allow custom arbitrary query if not found in dictionary
    if query and not any(r["symbol"] == query or r["symbol"] == f"{query}.TW" for r in results):
        if query.isdigit():
            results.insert(0, {
                "symbol": f"{query}.TW",
                "name": f"台股 {query}",
                "market": "TW",
                "display": f"{query}.TW"
            })
        else:
            results.insert(0, {
                "symbol": query,
                "name": f"美股 {query}",
                "market": "US",
                "display": f"{query} (US)"
            })

    return results[:15]

@app.get("/api/stocks/{symbol}/info")
def stock_info(symbol: str, market: str = "TW"):
    if market.upper() == "TW" or symbol.endswith(".TW") or symbol.endswith(".TWO"):
        return get_tw_stock_info(symbol)
    else:
        return get_us_stock_info(symbol)

@app.get("/api/stocks/{symbol}/kline")
def stock_kline(symbol: str, market: str = "TW", period: str = "1y", interval: str = "1d"):
    if market.upper() == "TW" or symbol.endswith(".TW") or symbol.endswith(".TWO"):
        return get_tw_kline(symbol, period=period, interval=interval)
    else:
        return get_us_kline(symbol, period=period, interval=interval)

@app.get("/api/stocks/{symbol}/fundamentals")
def stock_fundamentals(symbol: str, market: str = "TW"):
    if market.upper() == "TW" or symbol.endswith(".TW") or symbol.endswith(".TWO"):
        return get_tw_fundamentals(symbol)
    else:
        return get_us_fundamentals(symbol)

@app.get("/api/stocks/{symbol}/chips")
def stock_chips(symbol: str, market: str = "TW"):
    if market.upper() == "TW" or symbol.endswith(".TW") or symbol.endswith(".TWO"):
        return get_tw_chips(symbol)
    else:
        return get_us_institutional(symbol)

# ----------------- Collaborative Notes Endpoints -----------------

@app.get("/api/stocks/{symbol}/notes")
def list_notes(symbol: str, db: Session = Depends(get_db)):
    clean_sym = symbol.strip().upper()
    notes = db.query(StockNote).filter(
        StockNote.symbol == clean_sym,
        StockNote.is_deleted == False
    ).order_by(StockNote.updated_at.desc()).all()
    return notes

@app.post("/api/stocks/{symbol}/notes")
def create_note(symbol: str, note_in: NoteCreate, db: Session = Depends(get_db)):
    clean_sym = symbol.strip().upper()
    new_note = StockNote(
        symbol=clean_sym,
        market=note_in.market,
        author=note_in.author,
        title=note_in.title,
        content=note_in.content,
        tags=note_in.tags
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@app.put("/api/notes/{note_id}")
def update_note(note_id: str, note_in: NoteUpdate, db: Session = Depends(get_db)):
    note = db.query(StockNote).filter(StockNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note_in.title is not None:
        note.title = note_in.title
    if note_in.content is not None:
        note.content = note_in.content
    if note_in.tags is not None:
        note.tags = note_in.tags
    note.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(note)
    return note

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: str, db: Session = Depends(get_db)):
    note = db.query(StockNote).filter(StockNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.is_deleted = True
    note.updated_at = datetime.datetime.utcnow()
    db.commit()
    return {"status": "deleted", "id": note_id}

# ----------------- Chart Drawings Endpoints -----------------

@app.get("/api/stocks/{symbol}/drawings")
def get_drawings(symbol: str, db: Session = Depends(get_db)):
    clean_sym = symbol.strip().upper()
    drawings = db.query(ChartDrawing).filter(
        ChartDrawing.symbol == clean_sym,
        ChartDrawing.is_deleted == False
    ).order_by(ChartDrawing.updated_at.desc()).all()
    return drawings

@app.post("/api/stocks/{symbol}/drawings")
def save_drawings(symbol: str, draw_in: DrawingSave, db: Session = Depends(get_db)):
    clean_sym = symbol.strip().upper()
    existing = db.query(ChartDrawing).filter(
        ChartDrawing.symbol == clean_sym,
        ChartDrawing.user_id == draw_in.user_id,
        ChartDrawing.is_deleted == False
    ).first()

    if existing:
        existing.drawing_data = draw_in.drawing_data
        existing.is_public = draw_in.is_public
        existing.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_drawing = ChartDrawing(
            symbol=clean_sym,
            user_id=draw_in.user_id,
            drawing_data=draw_in.drawing_data,
            is_public=draw_in.is_public
        )
        db.add(new_drawing)
        db.commit()
        db.refresh(new_drawing)
        return new_drawing

# ----------------- Database Sync Endpoint -----------------

@app.post("/api/sync")
def trigger_sync():
    try:
        sync_tables()
        return {"status": "success", "message": "Database sync executed successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sync/status")
def sync_status(db: Session = Depends(get_db)):
    logs = db.query(SyncLog).order_by(SyncLog.created_at.desc()).limit(5).all()
    return logs
