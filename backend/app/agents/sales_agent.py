from app.agents.base_agent import BaseAgent


class SalesAgent(BaseAgent):
    name = "sales"
    prompt_file = "sales.txt"
    allowed_tools = ("sales_summary", "top_and_bottom_sellers", "profit_by_product")
