from app.agents.inventory_agent import InventoryAgent
from app.agents.sales_agent import SalesAgent


class Orchestrator:
    def __init__(self) -> None:
        self.inventory = InventoryAgent()
        self.sales = SalesAgent()

    def choose(self, question: str):
        keywords = ("sales", "sell", "seller", "profit", "margin", "revenue", "order", "change")
        return self.sales if any(word in question.lower() for word in keywords) else self.inventory
