from app.agents.base_agent import BaseAgent


class InventoryAgent(BaseAgent):
    name = "inventory"
    prompt_file = "inventory.txt"
    allowed_tools = ("get_stock", "days_until_stockout", "reorder_quantity", "top_and_bottom_sellers")
