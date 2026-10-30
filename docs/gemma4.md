# Gemma 4 in BizPilot

BizPilot uses `gemma-4-26b-a4b-it` as the primary model and
`gemma-4-31b-it` as the fallback. The ordered, de-duplicated chain is configured
by `gemma_model` and comma-separated `gemma_fallback_models`; non-Gemma-4 IDs are
logged and skipped. The model is used for meaningful
business reasoning over aggregate sales and inventory data; calculations are performed
by workspace-scoped Python tools.

## Where inference lives

The provider call is in [`backend/app/llm/client.py`](../backend/app/llm/client.py).
`GemmaClient` uses the `google-genai` SDK and reads the validated model chain from
settings. It tries each model in order, retrying once after about one second only
for transient 429/5xx/timeout/unavailable errors. The response `model` field and
frontend badge identify the model that actually succeeded. The
orchestrator selects an inventory or sales agent using deterministic keyword routing.
The selected agent sends only aggregate tool results to Gemma, validates requested
tools and arguments, and validates the final `AgentResult` JSON.

The normal agent path uses native Gemini function calling. Declarations are built
from the allow-listed registry in
[`backend/app/tools/registry.py`](../backend/app/tools/registry.py), and structured
calls are marked `mode: "native"` in the run trace. Native-to-JSON fallback has
exactly two triggers: the API rejects the tool declarations, or the first model
turn returns neither a structured function call nor a valid `AgentResult`. In the
second case the agent makes one JSON-only recovery request. A later turn after
tool results is expected to return the final `AgentResult`; plain text or invalid
JSON there does not trigger another tool request and cannot re-execute a tool.
JSON tool requests use (`{"tool": "...", "args": {...}}`) and are marked
`mode: "json"`. Provider failures return the raw aggregate tool data with low
confidence instead of raising an unhandled error.

## Privacy and safety

Tool results are scrubbed before they reach the model. Customer names, email
addresses, phone numbers, and user fields are removed or redacted. Workspace ID is
always taken from the authenticated request, never from model output. Tools are
allow-listed, argument-validated, limited to five calls, and bounded by a 30-second
provider timeout. Actions are proposals only; this feature never executes a reorder
or price change.

## Tools

- `get_stock`, `days_until_stockout`, and `reorder_quantity`
- `top_and_bottom_sellers`, `profit_by_product`, and `sales_summary`
- `price_change_impact` and `cash_buffer`

Money values are rounded to two decimal places. Product names support case-insensitive
partial matching and ambiguous matches are returned for clarification.

## Limitations and terms

The demo currently uses synthetic/sample data, native function calling with a JSON
fallback, the two-model Gemma 4 chain, and Gemini API/free-tier rate limits. Review
every proposed action against your own records.

Official Gemma terms: [Google Gemma Terms placeholder](https://ai.google.dev/gemma/terms).
These terms are separate from BizPilot's code license.
