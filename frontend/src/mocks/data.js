export const salesTrend = [
  { day: "Mon", sales: 28500, profit: 8200 },
  { day: "Tue", sales: 34200, profit: 10600 },
  { day: "Wed", sales: 30100, profit: 9100 },
  { day: "Thu", sales: 42800, profit: 14800 },
  { day: "Fri", sales: 38900, profit: 12100 },
  { day: "Sat", sales: 51600, profit: 18600 },
  { day: "Sun", sales: 46300, profit: 15900 }
];

export const monthlyTrend = [
  { day: "May 1", sales: 31000, profit: 9400 },
  { day: "May 5", sales: 38500, profit: 12100 },
  { day: "May 9", sales: 34200, profit: 10200 },
  { day: "May 13", sales: 49000, profit: 15800 },
  { day: "May 17", sales: 42500, profit: 13600 },
  { day: "May 21", sales: 56800, profit: 19400 },
  { day: "May 25", sales: 51200, profit: 17200 },
  { day: "May 29", sales: 63400, profit: 22100 }
];

export const products = [
  { id: "BP-1001", name: "Premium Maize Flour 2kg", category: "Groceries", sku: "GR-2048", stock: 18, reorderAt: 25, cost: 125, price: 165, sold: 184, status: "Low stock" },
  { id: "BP-1002", name: "Sunflower Cooking Oil 1L", category: "Groceries", sku: "GR-1102", stock: 64, reorderAt: 20, cost: 205, price: 260, sold: 156, status: "In stock" },
  { id: "BP-1003", name: "Long-life Milk 500ml", category: "Dairy", sku: "DY-0520", stock: 12, reorderAt: 30, cost: 48, price: 65, sold: 142, status: "Low stock" },
  { id: "BP-1004", name: "White Bread 400g", category: "Bakery", sku: "BK-0400", stock: 9, reorderAt: 15, cost: 48, price: 60, sold: 128, status: "Low stock" },
  { id: "BP-1005", name: "Laundry Detergent 1kg", category: "Household", sku: "HH-1020", stock: 43, reorderAt: 15, cost: 150, price: 195, sold: 96, status: "In stock" },
  { id: "BP-1006", name: "Fresh Eggs Tray", category: "Dairy", sku: "DY-0030", stock: 31, reorderAt: 12, cost: 390, price: 450, sold: 84, status: "In stock" },
  { id: "BP-1007", name: "Bottled Water 1L", category: "Beverages", sku: "BV-1000", stock: 7, reorderAt: 24, cost: 35, price: 50, sold: 72, status: "Critical" },
  { id: "BP-1008", name: "Instant Coffee 100g", category: "Beverages", sku: "BV-0100", stock: 27, reorderAt: 10, cost: 180, price: 230, sold: 63, status: "In stock" }
];

export const transactions = [
  { id: "TX-8432", item: "Sunflower Cooking Oil 1L", customer: "Walk-in customer", time: "10:42 AM", method: "M-Pesa", amount: 520, status: "Completed" },
  { id: "TX-8431", item: "Premium Maize Flour 2kg", customer: "Mary Wanjiku", time: "10:35 AM", method: "Cash", amount: 330, status: "Completed" },
  { id: "TX-8430", item: "Laundry Detergent 1kg", customer: "Walk-in customer", time: "10:18 AM", method: "M-Pesa", amount: 390, status: "Completed" },
  { id: "TX-8429", item: "Fresh Eggs Tray", customer: "Peter Mwangi", time: "09:56 AM", method: "Credit", amount: 900, status: "Pending" },
  { id: "TX-8428", item: "Long-life Milk 500ml", customer: "Walk-in customer", time: "09:41 AM", method: "Cash", amount: 195, status: "Completed" }
];

export const alerts = [
  { id: 1, type: "critical", title: "Bottled Water 1L is almost out", detail: "7 units left · 24 units recommended", action: "Review stock" },
  { id: 2, type: "warning", title: "Milk stock is running low", detail: "12 units left · Average 18 sold daily", action: "Plan reorder" },
  { id: 3, type: "info", title: "Your Saturday sales are trending up", detail: "Sales were 18% higher than last Saturday", action: "View report" }
];

export const initialMessages = [
  { role: "assistant", text: "Hi there! I'm your BizPilot business assistant. I can help you understand sales, keep an eye on stock and make smarter day-to-day decisions. What would you like to know?" }
];

export function formatKES(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency", currency: "KES", maximumFractionDigits: 0
  }).format(value);
}