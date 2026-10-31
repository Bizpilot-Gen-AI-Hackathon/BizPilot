from app.tools.finance_tools import cash_buffer, price_change_impact
from app.tools.sales_tools import profit_by_product, sales_summary, top_and_bottom_sellers
from app.tools.stock_tools import days_until_stockout, get_stock, reorder_quantity


_UNSUPPORTED_GEMINI_SCHEMA_KEYS = {
    "additionalProperties",
    "additional_properties",
    "$schema",
    "title",
    "default",
}


def normalize_gemini_schema(value):
    """Return a Gemini FunctionDeclaration-compatible schema without weakening local validation."""
    if isinstance(value, dict):
        return {
            key: normalize_gemini_schema(item)
            for key, item in value.items()
            if key not in _UNSUPPORTED_GEMINI_SCHEMA_KEYS
        }
    if isinstance(value, list):
        return [normalize_gemini_schema(item) for item in value]
    return value


TOOL_REGISTRY = {
    "top_and_bottom_sellers": {"function": top_and_bottom_sellers, "description": "Rank products by units, revenue, and profit. Use limit 1 to 10 and days 1 to 365.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer", "minimum": 1, "maximum": 365}, "limit": {"type": "integer", "minimum": 1, "maximum": 10}}, "additionalProperties": False}},
    "profit_by_product": {"function": profit_by_product, "description": "Return revenue, cost, profit, and margin by product. Use days 1 to 365.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer", "minimum": 1, "maximum": 365}}, "additionalProperties": False}},
    "sales_summary": {"function": sales_summary, "description": "Compare current sales and profit with the previous equal period. Use days 1 to 365.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer", "minimum": 1, "maximum": 365}}, "additionalProperties": False}},
    "get_stock": {"function": get_stock, "description": "Return workspace product stock and status.",
        "parameters": {"type": "object", "properties": {"product_name": {"type": "string"}}, "additionalProperties": False}},
    "days_until_stockout": {"function": days_until_stockout, "description": "Estimate days until a product runs out from recent sales. Use lookback_days 1 to 365.",
        "parameters": {"type": "object", "properties": {"product_name": {"type": "string"}, "lookback_days": {"type": "integer", "minimum": 1, "maximum": 365}}, "additionalProperties": False}},
    "reorder_quantity": {"function": reorder_quantity, "description": "Calculate units and cost for a stock reorder. Use cover_days 1 to 365.",
        "parameters": {"type": "object", "properties": {"product_name": {"type": "string"}, "cover_days": {"type": "integer", "minimum": 1, "maximum": 365}}, "additionalProperties": False}},
    "price_change_impact": {"function": price_change_impact, "description": "Calculate the impact of a proposed product price.",
        "parameters": {"type": "object", "required": ["product_name", "new_price"], "properties": {"product_name": {"type": "string"}, "new_price": {"type": "number"}}, "additionalProperties": False}},
    "cash_buffer": {"function": cash_buffer, "description": "Calculate a suggested cash buffer from recent expenses.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False}},
}