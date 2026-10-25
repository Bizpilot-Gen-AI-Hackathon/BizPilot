
import React, { useMemo, useState } from "react";
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    CalendarDays,
    Download,
    FileSpreadsheet,
    TrendingUp,
    Wallet,
} from "lucide-react";

import KPICard from "../components/KPICard";
import Charts from "../components/Charts";

const WEEKLY_DATA = [
    { day: "Mon", revenue: 32400, profit: 9400, sales: 52 },
    { day: "Tue", revenue: 38600, profit: 11200, sales: 64 },
    { day: "Wed", revenue: 29100, profit: 8100, sales: 47 },
    { day: "Thu", revenue: 45200, profit: 13900, sales: 76 },
    { day: "Fri", revenue: 41800, profit: 12100, sales: 70 },
    { day: "Sat", revenue: 56700, profit: 17600, sales: 91 },
    { day: "Sun", revenue: 42900, profit: 13100, sales: 73 },
];

const PRODUCT_DATA = [
    { name: "Premium Coffee", units: 248, revenue: 12400, profit: 6200 },
    { name: "Organic Honey", units: 186, revenue: 9300, profit: 3348 },
    { name: "Fresh Milk", units: 164, revenue: 6560, profit: 2198 },
    { name: "Wholegrain Bread", units: 142, revenue: 5680, profit: 2272 },
];

const money = (value) =>
    new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
    }).format(value);

const number = (value) =>
    new Intl.NumberFormat("en-KE").format(value);

const styles = `
.reports-page {
    --report-green: #16835f;
    --report-green-dark: #12694e;
    --report-green-soft: #eaf6ef;
    --report-ink: #1c3028;
    --report-muted: #748078;
    --report-border: #e5ebe6;
    --report-surface: #ffffff;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    padding: 8px 0 32px;
    color: var(--report-ink);
    animation: reports-enter 0.35s ease both;
}

.reports-page *,
.reports-page *::before,
.reports-page *::after {
    box-sizing: border-box;
}

@keyframes reports-enter {
    from { opacity: 0; transform: translateY(7px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes reports-spin {
    to { transform: rotate(360deg); }
}

.reports-page button,
.reports-page select {
    font: inherit;
}

.reports-page button:focus-visible,
.reports-page select:focus-visible {
    outline: 3px solid rgba(22, 131, 95, 0.24);
    outline-offset: 3px;
}

.reports-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
}

.reports-heading {
    min-width: 0;
}

.reports-eyebrow {
    display: inline-block;
    margin: 0 0 9px;
    color: var(--report-green);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    line-height: 1.5;
}

.reports-heading h1 {
    margin: 0;
    color: var(--report-ink);
    font-size: clamp(25px, 3vw, 34px);
    font-weight: 750;
    letter-spacing: -1.1px;
    line-height: 1.2;
}

.reports-description {
    max-width: 590px;
    margin: 10px 0 0;
    color: var(--report-muted);
    font-size: 14px;
    line-height: 1.7;
}

.reports-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
}

.reports-period-select {
    min-height: 42px;
    padding: 0 34px 0 12px;
    border: 1px solid var(--report-border);
    border-radius: 10px;
    background: var(--report-surface);
    color: var(--report-ink);
    font-size: 13px;
    cursor: pointer;
}

.reports-export-button {
    display: inline-flex;
    min-height: 42px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0 16px;
    border: 1px solid var(--report-green);
    border-radius: 10px;
    background: var(--report-green);
    color: white;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
}

.reports-export-button:hover:not(:disabled) {
    background: var(--report-green-dark);
    transform: translateY(-1px);
}

.reports-export-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.reports-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
}

.reports-summary-title {
    margin: 0;
    color: var(--report-ink);
    font-size: 16px;
    font-weight: 750;
}

.reports-summary-note {
    margin: 5px 0 0;
    color: var(--report-muted);
    font-size: 12px;
}

.reports-demo-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border: 1px solid #dcece1;
    border-radius: 8px;
    background: #f4faf5;
    color: #32674c;
    font-size: 11px;
    font-weight: 700;
}

.reports-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.reports-metrics > * {
    min-width: 0;
}

.reports-chart-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: 18px;
    margin-bottom: 24px;
}

.reports-panel {
    min-width: 0;
    overflow: hidden;
    padding: 22px;
    border: 1px solid var(--report-border);
    border-radius: 15px;
    background: var(--report-surface);
    box-shadow: 0 3px 12px rgba(30, 60, 42, 0.025);
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.reports-panel:hover {
    border-color: #d8e5dc;
    box-shadow: 0 7px 22px rgba(30, 60, 42, 0.045);
}

.reports-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
}

.reports-panel-header h2 {
    margin: 0;
    color: var(--report-ink);
    font-size: 16px;
    font-weight: 750;
    letter-spacing: -0.2px;
}

.reports-panel-header p {
    margin: 6px 0 0;
    color: var(--report-muted);
    font-size: 12px;
    line-height: 1.6;
}

.reports-panel-icon {
    display: inline-flex;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2eee5;
    border-radius: 10px;
    background: #f2f8f3;
    color: var(--report-green);
}

.reports-chart-content {
    min-width: 0;
    min-height: 250px;
}

.reports-chart-content > * {
    max-width: 100%;
}

.reports-chart-caption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 15px;
    padding-top: 14px;
    border-top: 1px solid #edf0ed;
    color: var(--report-muted);
    font-size: 12px;
}

.reports-chart-caption strong {
    color: var(--report-ink);
    font-size: 13px;
}

.reports-products-panel {
    padding: 0;
}

.reports-products-header {
    padding: 22px 22px 18px;
    margin: 0;
}

.reports-product-count {
    flex: 0 0 auto;
    padding: 7px 10px;
    border: 1px solid var(--report-border);
    border-radius: 8px;
    color: var(--report-muted);
    font-size: 11px;
    font-weight: 700;
}

.reports-table-scroll {
    width: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
}

.reports-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    white-space: nowrap;
}

.reports-table thead {
    background: #f7f9f7;
}

.reports-table th {
    padding: 12px 22px;
    border-top: 1px solid #edf0ed;
    border-bottom: 1px solid #edf0ed;
    color: #758078;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.7px;
    text-transform: uppercase;
}

.reports-table td {
    padding: 16px 22px;
    border-bottom: 1px solid #edf0ed;
    color: #526057;
    font-size: 13px;
}

.reports-table tbody tr {
    transition: background 0.18s ease;
}

.reports-table tbody tr:hover {
    background: #f8fbf8;
}

.reports-table tbody tr:last-child td {
    border-bottom: 0;
}

.reports-product-name {
    color: var(--report-ink) !important;
    font-weight: 700;
}

.reports-table-number {
    color: var(--report-ink) !important;
    font-variant-numeric: tabular-nums;
    font-weight: 650;
}

.reports-profit {
    color: var(--report-green-dark) !important;
    font-weight: 700;
}

.reports-margin {
    display: inline-flex;
    min-width: 60px;
    justify-content: center;
    padding: 5px 8px;
    border-radius: 6px;
    background: var(--report-green-soft);
    color: #26704d;
    font-size: 11px;
    font-weight: 750;
}

.reports-footer {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px 22px;
    border-top: 1px solid #edf0ed;
    background: #fbfcfb;
    color: var(--report-muted);
    font-size: 11px;
    line-height: 1.7;
}

.reports-footer svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #718078;
}

.reports-empty {
    display: grid;
    min-height: 180px;
    place-content: center;
    gap: 8px;
    color: var(--report-muted);
    text-align: center;
    font-size: 13px;
}

.reports-empty strong {
    color: var(--report-ink);
}

@media (max-width: 1100px) {
    .reports-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .reports-chart-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .reports-chart-content {
        min-height: 220px;
    }
}

@media (max-width: 640px) {
    .reports-page {
        padding-top: 0;
    }

    .reports-header {
        flex-direction: column;
        gap: 18px;
        margin-bottom: 22px;
    }

    .reports-actions {
        width: 100%;
        justify-content: stretch;
    }

    .reports-period-select {
        flex: 1;
        min-width: 0;
    }

    .reports-export-button {
        flex: 1;
    }

    .reports-metrics {
        gap: 11px;
    }

    .reports-panel {
        padding: 16px;
        border-radius: 12px;
    }

    .reports-products-panel {
        padding: 0;
    }

    .reports-products-header {
        padding: 17px 16px;
    }

    .reports-panel-header h2 {
        font-size: 15px;
    }

    .reports-chart-content {
        min-height: 190px;
    }

    .reports-table th,
    .reports-table td {
        padding: 13px 15px;
    }

    .reports-footer {
        padding: 14px 16px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .reports-page,
    .reports-page *,
    .reports-page *::before,
    .reports-page *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
    }
}
`;

export default function Reports() {
    const [period, setPeriod] = useState("7");

    const data = useMemo(() => {
        const count = Number(period);
        return WEEKLY_DATA.slice(-count);
    }, [period]);

    const totals = useMemo(
        () =>
            data.reduce(
                (result, day) => ({
                    revenue: result.revenue + day.revenue,
                    profit: result.profit + day.profit,
                    sales: result.sales + day.sales,
                }),
                { revenue: 0, profit: 0, sales: 0 }
            ),
        [data]
    );

    const margin =
        totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

    const bestDay = useMemo(
        () =>
            data.reduce(
                (best, day) => (day.revenue > best.revenue ? day : best),
                data[0] || { day: "—", revenue: 0 }
            ),
        [data]
    );

    function exportCsv() {
        const header = ["Day", "Revenue (KES)", "Gross Profit (KES)", "Sales"];

        const rows = data.map((item) => [
            item.day,
            item.revenue,
            item.profit,
            item.sales,
        ]);

        const csv = [header, ...rows]
            .map((row) =>
                row
                    .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\r\n");

        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `bizpilot-report-${period}-days.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    return (
        <main className="reports-page">
            <style>{styles}</style>

            <header className="reports-header">
                <div className="reports-heading">
                    <p className="reports-eyebrow">BUSINESS INTELLIGENCE</p>
                    <h1>Reports &amp; analytics</h1>
                    <p className="reports-description">
                        Understand your sales, track profitability, and see which
                        products contribute most to your business.
                    </p>
                </div>

                <div className="reports-actions">
                    <select
                        className="reports-period-select"
                        value={period}
                        onChange={(event) => setPeriod(event.target.value)}
                        aria-label="Reporting period"
                    >
                        <option value="7">Last 7 days</option>
                        <option value="5">Last 5 days</option>
                        <option value="3">Last 3 days</option>
                    </select>

                    <button
                        className="reports-export-button"
                        type="button"
                        onClick={exportCsv}
                    >
                        <Download size={16} />
                        Export report
                    </button>
                </div>
            </header>

            <section className="reports-summary">
                <div>
                    <h2 className="reports-summary-title">Performance overview</h2>
                    <p className="reports-summary-note">
                        Summary for the selected reporting period
                    </p>
                </div>

                <span className="reports-demo-label">
                    <CalendarDays size={14} />
                    Sample data · {data.length} days
                </span>
            </section>

            <section className="reports-metrics" aria-label="Performance metrics">
                <KPICard
                    title="Total revenue"
                    value={money(totals.revenue)}
                    description={`Across ${data.length} sample days`}
                    icon={Wallet}
                />

                <KPICard
                    title="Gross profit"
                    value={money(totals.profit)}
                    description="Illustrative gross profit"
                    icon={TrendingUp}
                />

                <KPICard
                    title="Sales recorded"
                    value={number(totals.sales)}
                    description="Sample sales volume"
                    icon={Activity}
                />

                <KPICard
                    title="Gross margin"
                    value={`${margin.toFixed(1)}%`}
                    description="Profit as a share of revenue"
                    icon={BarChart3}
                />
            </section>

            <section className="reports-chart-grid">
                <article className="reports-panel">
                    <div className="reports-panel-header">
                        <div>
                            <h2>Revenue trend</h2>
                            <p>Daily revenue in Kenyan shillings</p>
                        </div>

                        <span className="reports-panel-icon">
                            <Wallet size={18} />
                        </span>
                    </div>

                    <div className="reports-chart-content">
                        {data.length > 0 ? (
                            <Charts
                                data={data}
                                type="revenue"
                                dataKey="revenue"
                                xKey="day"
                            />
                        ) : (
                            <div className="reports-empty">
                                No revenue data available.
                            </div>
                        )}
                    </div>

                    <div className="reports-chart-caption">
                        <span>Highest revenue day</span>
                        <strong>
                            {bestDay.day} · {money(bestDay.revenue)}
                        </strong>
                    </div>
                </article>

                <article className="reports-panel">
                    <div className="reports-panel-header">
                        <div>
                            <h2>Daily sales volume</h2>
                            <p>Number of sales recorded each day</p>
                        </div>

                        <span className="reports-panel-icon">
                            <BarChart3 size={18} />
                        </span>
                    </div>

                    <div className="reports-chart-content">
                        {data.length > 0 ? (
                            <Charts
                                data={data}
                                type="sales"
                                dataKey="sales"
                                xKey="day"
                            />
                        ) : (
                            <div className="reports-empty">
                                No sales data available.
                            </div>
                        )}
                    </div>

                    <div className="reports-chart-caption">
                        <span>Total sales in period</span>
                        <strong>{number(totals.sales)} sales</strong>
                    </div>
                </article>
            </section>

            <section className="reports-panel reports-products-panel">
                <div className="reports-panel-header reports-products-header">
                    <div>
                        <h2>Product performance</h2>
                        <p>
                            Revenue, gross profit and margin by product
                        </p>
                    </div>

                    <span className="reports-product-count">
                        {PRODUCT_DATA.length} products
                    </span>
                </div>

                <div className="reports-table-scroll">
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th scope="col">Product</th>
                                <th scope="col">Units sold</th>
                                <th scope="col">Revenue</th>
                                <th scope="col">Gross profit</th>
                                <th scope="col">Margin</th>
                            </tr>
                        </thead>

                        <tbody>
                            {PRODUCT_DATA.map((product) => {
                                const productMargin =
                                    product.revenue > 0
                                        ? (product.profit / product.revenue) * 100
                                        : 0;

                                return (
                                    <tr key={product.name}>
                                        <td className="reports-product-name">
                                            {product.name}
                                        </td>

                                        <td className="reports-table-number">
                                            {number(product.units)}
                                        </td>

                                        <td className="reports-table-number">
                                            {money(product.revenue)}
                                        </td>

                                        <td className="reports-profit">
                                            {money(product.profit)}
                                        </td>

                                        <td>
                                            <span className="reports-margin">
                                                {productMargin.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="reports-footer">
                    <FileSpreadsheet size={15} />
                    <span>
                        All figures are illustrative demo data, not actual business
                        results. The exported CSV contains daily figures for the
                        selected period.
                    </span>
                </div>
            </section>
        </main>
    );
}
