from datetime import datetime
from collections import Counter
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .database import Base, engine, get_db
from . import models, schemas
from .seed import seed_data

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Returns & Exchange Intelligence API", version="1.0.0",
              description="Demo post-purchase workflow and operations intelligence API.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "returns-exchange-intelligence"}

@app.get("/api/orders", response_model=list[schemas.OrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.order_date.desc()).all()

@app.get("/api/inventory", response_model=list[schemas.InventoryOut])
def get_inventory(db: Session = Depends(get_db)):
    return db.query(models.Inventory).order_by(models.Inventory.sku, models.Inventory.size).all()

@app.get("/api/returns")
def get_returns(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.ReturnRequest).options(joinedload(models.ReturnRequest.order)).order_by(models.ReturnRequest.created_at.desc())
    if status and status != "ALL":
        q = q.filter(models.ReturnRequest.status == status)
    rows = q.all()
    return [{
        "id": r.id, "order_id": r.order_id, "customer_name": r.order.customer_name,
        "product_name": r.order.product_name, "sku": r.order.sku, "size": r.order.size,
        "price": r.order.price, "request_type": r.request_type, "reason": r.reason,
        "comments": r.comments, "requested_size": r.requested_size, "status": r.status,
        "disposition": r.disposition, "created_at": r.created_at.isoformat(),
        "updated_at": r.updated_at.isoformat(),
        "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None
    } for r in rows]

@app.post("/api/returns", response_model=schemas.ReturnOut, status_code=201)
def create_return(payload: schemas.ReturnCreate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if not order.delivered:
        raise HTTPException(400, "Only delivered orders can be returned")
    if payload.request_type == "EXCHANGE" and not payload.requested_size:
        raise HTTPException(400, "Select a requested size for an exchange")
    existing = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.order_id == payload.order_id,
        ~models.ReturnRequest.status.in_(["COMPLETED", "REJECTED"])
    ).first()
    if existing:
        raise HTTPException(409, "An active return/exchange request already exists for this order")
    req = models.ReturnRequest(**payload.model_dump())
    db.add(req)
    db.flush()
    db.add(models.StatusHistory(request_id=req.id, status="REQUESTED", note="Request submitted by customer"))
    db.commit()
    db.refresh(req)
    return req

ALLOWED_TRANSITIONS = {
    "REQUESTED": {"APPROVED", "REJECTED"},
    "APPROVED": {"PICKUP_SCHEDULED", "REJECTED"},
    "PICKUP_SCHEDULED": {"RECEIVED"},
    "RECEIVED": {"INSPECTED"},
    "INSPECTED": set(),
    "COMPLETED": set(),
    "REJECTED": set(),
}

@app.patch("/api/returns/{request_id}/status", response_model=schemas.ReturnOut)
def update_status(request_id: int, payload: schemas.StatusUpdate, db: Session = Depends(get_db)):
    req = db.query(models.ReturnRequest).filter(models.ReturnRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if payload.status not in ALLOWED_TRANSITIONS.get(req.status, set()):
        raise HTTPException(400, f"Invalid transition: {req.status} → {payload.status}")
    req.status = payload.status
    req.updated_at = datetime.utcnow()
    if payload.status == "REJECTED":
        req.resolved_at = datetime.utcnow()
    db.add(models.StatusHistory(request_id=req.id, status=payload.status, note=payload.note or "Updated by operations"))
    db.commit()
    db.refresh(req)
    return req

@app.post("/api/returns/{request_id}/inspect", response_model=schemas.ReturnOut)
def inspect_return(request_id: int, payload: schemas.InspectionCreate, db: Session = Depends(get_db)):
    req = db.query(models.ReturnRequest).filter(models.ReturnRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "RECEIVED":
        raise HTTPException(400, "Inspection is allowed only after the item is received")
    order = db.query(models.Order).filter(models.Order.id == req.order_id).first()

    if payload.disposition == "EXCHANGE":
        size = payload.requested_size or req.requested_size
        if not size:
            raise HTTPException(400, "Requested exchange size is missing")
        stock = db.query(models.Inventory).filter(
            models.Inventory.sku == order.sku, models.Inventory.size == size
        ).with_for_update().first()
        if not stock or stock.available_qty < 1:
            raise HTTPException(409, f"No available stock for SKU {order.sku}, size {size}")
        stock.available_qty -= 1
        req.requested_size = size
    elif payload.disposition == "RESTOCK":
        stock = db.query(models.Inventory).filter(
            models.Inventory.sku == order.sku, models.Inventory.size == order.size
        ).first()
        if stock:
            stock.available_qty += 1
        else:
            db.add(models.Inventory(sku=order.sku, size=order.size, available_qty=1))

    req.disposition = payload.disposition
    req.status = "INSPECTED"
    db.add(models.StatusHistory(request_id=req.id, status="INSPECTED", note=f"{payload.disposition}: {payload.note}".strip()))
    if payload.disposition in {"RESTOCK", "REFUND", "EXCHANGE"}:
        req.status = "COMPLETED"
        req.resolved_at = datetime.utcnow()
        db.add(models.StatusHistory(request_id=req.id, status="COMPLETED", note=f"Outcome: {payload.disposition}"))
    elif payload.disposition == "REJECT":
        req.status = "REJECTED"
        req.resolved_at = datetime.utcnow()
        db.add(models.StatusHistory(request_id=req.id, status="REJECTED", note=payload.note or "Rejected after inspection"))
    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return req

@app.get("/api/returns/{request_id}/history")
def get_history(request_id: int, db: Session = Depends(get_db)):
    req = db.query(models.ReturnRequest).filter(models.ReturnRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    return [{"status": h.status, "note": h.note, "changed_at": h.changed_at.isoformat()}
            for h in sorted(req.history, key=lambda x: x.changed_at)]

@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.delivered == True).count()
    requests = db.query(models.ReturnRequest).all()
    total = len(requests)
    open_count = sum(r.status not in {"COMPLETED", "REJECTED"} for r in requests)
    resolved = [r for r in requests if r.resolved_at]
    avg_hours = round(sum((r.resolved_at-r.created_at).total_seconds()/3600 for r in resolved)/len(resolved), 1) if resolved else 0
    inspected = [r for r in requests if r.disposition]
    restocked = sum(r.disposition == "RESTOCK" for r in inspected)
    reason_counts = Counter(r.reason for r in requests)
    return {
        "delivered_orders": orders,
        "total_requests": total,
        "return_rate_pct": round((total / orders) * 100, 1) if orders else 0,
        "open_requests": open_count,
        "avg_resolution_hours": avg_hours,
        "restock_rate_pct": round((restocked / len(inspected))*100, 1) if inspected else 0,
        "reason_mix": [{"reason": k, "count": v} for k, v in reason_counts.most_common()],
        "status_mix": [{"status": k, "count": v} for k, v in Counter(r.status for r in requests).most_common()],
    }
