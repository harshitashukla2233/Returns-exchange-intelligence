from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Order, Inventory, ReturnRequest, StatusHistory

def seed_data(db: Session):
    if db.query(Order).count():
        return

    orders = [
        Order(customer_name="Aarav Mehta", product_name="Classic Oxford Shirt", sku="SHIRT-OX-01", category="Men's Clothing", size="M", price=1499, order_date=datetime.utcnow()-timedelta(days=12)),
        Order(customer_name="Aarav Mehta", product_name="Slim Fit Chinos", sku="CHINO-SL-02", category="Men's Clothing", size="32", price=1899, order_date=datetime.utcnow()-timedelta(days=9)),
        Order(customer_name="Diya Kapoor", product_name="Running Sneakers", sku="SHOE-RN-03", category="Footwear", size="8", price=2999, order_date=datetime.utcnow()-timedelta(days=8)),
        Order(customer_name="Kabir Rao", product_name="Printed Casual Dress", sku="DRESS-PR-04", category="Women's Clothing", size="S", price=2199, order_date=datetime.utcnow()-timedelta(days=7)),
        Order(customer_name="Diya Kapoor", product_name="Denim Jacket", sku="JACKET-DN-05", category="Women's Clothing", size="M", price=3499, order_date=datetime.utcnow()-timedelta(days=6)),
    ]
    db.add_all(orders)
    db.flush()

    inventory = [
        Inventory(sku="SHIRT-OX-01", size="S", available_qty=7),
        Inventory(sku="SHIRT-OX-01", size="M", available_qty=3),
        Inventory(sku="SHIRT-OX-01", size="L", available_qty=5),
        Inventory(sku="CHINO-SL-02", size="30", available_qty=4),
        Inventory(sku="CHINO-SL-02", size="32", available_qty=2),
        Inventory(sku="CHINO-SL-02", size="34", available_qty=6),
        Inventory(sku="SHOE-RN-03", size="7", available_qty=2),
        Inventory(sku="SHOE-RN-03", size="8", available_qty=4),
        Inventory(sku="SHOE-RN-03", size="9", available_qty=5),
        Inventory(sku="DRESS-PR-04", size="S", available_qty=3),
        Inventory(sku="DRESS-PR-04", size="M", available_qty=4),
        Inventory(sku="JACKET-DN-05", size="M", available_qty=2),
        Inventory(sku="JACKET-DN-05", size="L", available_qty=3),
    ]
    db.add_all(inventory)
    db.flush()

    r1 = ReturnRequest(order_id=orders[0].id, request_type="EXCHANGE", reason="SIZE_TOO_SMALL", requested_size="L", status="PICKUP_SCHEDULED")
    r2 = ReturnRequest(order_id=orders[2].id, request_type="RETURN", reason="COMFORT_ISSUE", comments="Sole feels stiff after trying indoors.", status="RECEIVED")
    r3 = ReturnRequest(order_id=orders[3].id, request_type="RETURN", reason="COLOUR_DIFFERENCE", status="REQUESTED")
    db.add_all([r1, r2, r3])
    db.flush()
    for req, statuses in [
        (r1, ["REQUESTED", "APPROVED", "PICKUP_SCHEDULED"]),
        (r2, ["REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "RECEIVED"]),
        (r3, ["REQUESTED"]),
    ]:
        for status in statuses:
            db.add(StatusHistory(request_id=req.id, status=status, note="Seeded demo event"))
    db.commit()
