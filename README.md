# Returns & Exchange Intelligence Platform

A portfolio-ready e-commerce post-purchase operations project. It demonstrates a customer returns/exchange journey and an operations workspace for processing requests, inspecting returned items, recording inventory disposition, and monitoring service KPIs.

> This is a simulated portfolio project. It uses seeded demo orders and synthetic data; it is not connected to Myntra or any real retailer.

## Features

### Customer experience
- Browse demo orders and request a return or size exchange.
- Select a structured return reason and add optional comments.
- View the request lifecycle and latest status.

### Operations workspace
- View all requests and filter by status.
- Advance requests through a controlled lifecycle.
- Record inspection outcomes: restock, exchange, refund, or reject.
- Check available exchange stock before confirming an exchange.
- View operational KPIs: return rate, open requests, average resolution time, restock rate, and reason mix.

### Technical stack
- Backend: Python, FastAPI, SQLAlchemy, SQLite
- Frontend: React, Vite, plain CSS
- API docs: Swagger UI at `/docs`

SQLite is used for easy local setup. The data layer can be migrated to PostgreSQL later.

## Project structure

```text
returns_exchange_intelligence/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
└── README.md
```

## Run locally

### 1. Backend

Python 3.10+ recommended.

```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. On first start, the app creates `returns.db` and seeds demo orders, inventory, and return requests.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

The frontend calls the backend at `http://127.0.0.1:8000`. If you change the backend URL, set `VITE_API_URL` before starting Vite.

## Demo flow

1. Open the Customer tab and select one of the seeded orders.
2. Submit a return or exchange request with a reason.
3. Switch to Operations.
4. Select the new request and advance it through:
   `REQUESTED → APPROVED → PICKUP_SCHEDULED → RECEIVED → INSPECTED`.
5. At inspection, choose a disposition:
   - `RESTOCK`: item is returned to sellable inventory.
   - `REFUND`: request is marked completed with a refund outcome.
   - `EXCHANGE`: requires available stock for the requested size.
   - `REJECT`: request is rejected after inspection.
6. Open Analytics to review the operational KPIs.

## Lifecycle and business rules

- A request must be in the correct state before it can be advanced.
- Only received items can be inspected.
- An exchange can be completed only when the requested SKU/size has stock.
- Restocking increases available inventory only after a successful inspection outcome.
- Each status change is written to a status-history record.
- Resolution time is calculated from request creation to completion.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/orders` | Demo customer orders |
| GET | `/api/returns` | Return/exchange requests |
| POST | `/api/returns` | Create a request |
| PATCH | `/api/returns/{id}/status` | Advance lifecycle status |
| POST | `/api/returns/{id}/inspect` | Record inspection/disposition |
| GET | `/api/inventory` | Inventory by SKU/size |
| GET | `/api/analytics` | Operational KPI summary |

Full interactive API documentation: `http://127.0.0.1:8000/docs`.

## Product metrics included

- **Return rate** = returned/requested units divided by delivered units in the demo dataset.
- **Open requests** = requests not in a terminal state.
- **Average resolution time** = mean hours from request creation to terminal status.
- **Restock rate** = requests with a restock disposition divided by inspected requests.
- **Reason mix** = distribution of customer-selected return reasons.

These are descriptive demo metrics, not evidence that the product reduces returns. To make a defensible impact claim, run usability tests or a controlled experiment and report the observed sample size and results.

## Suggested next improvements

- Replace demo identity with authentication and role-based access control.
- Add a PostgreSQL deployment profile and database migrations.
- Add pickup partner integration and notification events.
- Add policy configuration by product category and return window.
- Add CSV export, audit log views, and automated tests.
- Conduct 5–8 usability sessions and document task completion, errors, and feedback.

## Resume-safe project description

**Returns & Exchange Intelligence Platform | Python, FastAPI, React, SQLite**
- Built a full-stack post-purchase workflow for creating and tracking return/exchange requests, with customer and operations views.
- Implemented a request state machine, inspection dispositions, inventory-aware exchange validation, and status-history tracking.
- Developed an operations KPI view covering request volume, resolution time, restock outcomes, and return-reason distribution.

Only claim features you have run and can explain in an interview.
