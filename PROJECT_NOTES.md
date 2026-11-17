# Product and interview notes

## Problem statement
Customers need a clear way to request and track a return or exchange. Operations teams need a consistent workflow that prevents requests from getting lost, records inspection outcomes, and keeps exchange inventory accurate.

## Primary personas
1. Customer: wants a low-friction self-service request and clear status updates.
2. Returns operations associate: needs a prioritized queue, customer context, and controlled actions.
3. Inventory associate: needs confidence that returned stock is not made sellable until inspection and that exchanges do not oversell.

## MVP scope
- Request creation and duplicate-active-request prevention.
- Structured reason codes.
- Request lifecycle and status history.
- Inspection outcome and inventory update.
- Exchange stock validation.
- Basic operational metrics.

## Out of scope
- Real payment refunds, courier pickup booking, customer login, production authentication, actual Myntra integration, ML-based fraud decisions.
- Do not claim these are implemented.

## Key product decisions
- Keep the customer flow separate from the operations queue.
- Treat return reason as structured data so the team can identify recurring friction.
- Keep inventory unavailable until inspection confirms a restock outcome.
- Reject an exchange when the requested size has no available stock.
- Maintain status history for traceability.

## Suggested user test
Recruit 5–8 people unfamiliar with the interface. Ask them to submit a return, locate its status, and as an operations user process a received item. Record task completion, time on task, errors, and points of confusion. Do not invent results.

## Acceptance criteria
- A delivered order can create one active request.
- An exchange requires a requested size.
- A second active request for the same order is blocked.
- Invalid lifecycle transitions return a clear error.
- Inspection cannot happen before receipt.
- Exchange stock is checked and decremented only on successful completion.
- Restock disposition adds one unit back to sellable inventory.
- Terminal requests show a resolution timestamp.
