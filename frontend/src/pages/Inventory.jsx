import React, { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Boxes, Search, SlidersHorizontal } from "lucide-react";
import { formatKES, products } from "../mocks/data";

export default function Inventory() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All items");
  const filtered = useMemo(() => products.filter((p) => {
    const matches = `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase());
    const status = filter === "All items" || (filter === "Low stock" && p.stock <= p.reorderAt) || (filter === "In stock" && p.stock > p.reorderAt);
    return matches && status;
  }), [query, filter]);
  const low = products.filter((p) => p.stock <= p.reorderAt).length;
  return <div className="page-stack">
    <div className="page-intro-row"><div><span className="eyebrow">STOCK CONTROL</span><h2>Inventory</h2><p>Keep the right products on your shelves and spot risks early.</p></div><button className="button button-secondary" onClick={() => window.alert("Inventory export will be connected to the reporting service.")}><ArrowDownToLine size={16} /> Export inventory</button></div>
    <div className="kpi-grid compact-kpis"><div className="mini-stat"><span className="mini-stat-icon"><Boxes size={18}/></span><span>Total products</span><strong> {products.length} </strong><small>Across 5 categories</small></div><div className="mini-stat"><span className="mini-stat-icon warning-bg"><SlidersHorizontal size={18}/></span><span>Low stock</span><strong>{low}</strong><small>Items to review</small></div><div className="mini-stat"><span className="mini-stat-icon"><ArrowUpRight size={18}/></span><span>Stock value</span><strong>{formatKES(products.reduce((sum,p)=>sum+p.stock*p.cost,0))}</strong><small>Estimated at cost</small></div></div>
    <section className="panel">
      <div className="table-toolbar"><div><h3>Stock overview</h3><p>Monitor quantities and reorder thresholds</p></div><div className="table-controls"><label className="search-field"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search products..." /></label><select value={filter} onChange={(e)=>setFilter(e.target.value)} aria-label="Filter inventory"><option>All items</option><option>Low stock</option><option>In stock</option></select></div></div>
      <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>ON HAND</th><th>REORDER LEVEL</th><th>UNIT COST</th><th>STATUS</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><div className="table-product"><span className="product-thumb">{p.name.slice(0,1)}</span><strong>{p.name}</strong></div></td><td className="table-id">{p.sku}</td><td>{p.category}</td><td><strong>{p.stock}</strong> <span className="muted-cell">units</span></td><td>{p.reorderAt} units</td><td className="amount-cell">{formatKES(p.cost)}</td><td><span className={`status-pill ${p.stock <= p.reorderAt ? "status-pending" : "status-complete"}`}>{p.stock <= p.reorderAt ? "Low stock" : "In stock"}</span></td></tr>)}</tbody></table>{filtered.length===0 && <div className="empty-state">No products match your search.</div>}</div>
      <div className="table-bottom"><span>Showing {filtered.length} of {products.length} products</span><span className="demo-pill">DEMO DATA</span></div>
    </section>
  </div>;
}