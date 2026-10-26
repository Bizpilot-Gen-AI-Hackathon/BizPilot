import React, { useEffect, useMemo, useState } from "react";
import {
    Activity,
    ArrowRight,
    ArrowUpRight,
    Boxes,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    Search,
    ShoppingBag,
    TriangleAlert,
    Wallet,
    RefreshCw,
    X,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { getDashboardSummary, getSalesTrend, getAlerts, getTransactions, getProducts } from "../services/api";
import { salesTrend, monthlyTrend, alerts as mockAlerts, transactions as mockTx, products as mockProducts } from "../mocks/data";

import KPICard from "../components/KPICard";
import Alerts from "../components/Alerts";
import { SalesChart, ProductBarChart } from "../components/Charts";

const mockSummary = {
    totalSales: 287400,
    grossProfit: 86420,
    ordersToday: 128,
};

let hasLoadedOnce = false;

function reducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
}

function useFirstLoad() {
    const [loading, setLoading] = useState(!hasLoadedOnce);

    useEffect(() => {
        if (!loading) return undefined;

        const timer = window.setTimeout(() => {
            hasLoadedOnce = true;
            setLoading(false);
        }, reducedMotion() ? 0 : 450);

        return () => window.clearTimeout(timer);
    }, [loading]);

    return loading;
}

function useCountUp(target, active, duration = 700) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) {
            setValue(0);
            return undefined;
        }

        if (reducedMotion()) {
            setValue(target);
            return undefined;
        }

        let frame;
        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setValue(target * eased);

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        }

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [target, active, duration]);

    return Math.round(value);
}

function greeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function getFirstName(profile) {
    const name =
        profile?.name ||
        profile?.ownerName ||
        profile?.fullName ||
        "";

    const trimmedName = String(name).trim();

    return trimmedName ? trimmedName.split(/\s+/)[0] : "there";
}

/**
 * Formats an amount using the currency selected in Settings.
 * This formats the amount only; it does not perform exchange-rate conversion.
 */
function formatCurrency(amount, currency = "KES", languageCode = "en") {
    const numericAmount = Number(amount) || 0;

    try {
        return new Intl.NumberFormat(languageCode || "en", {
            style: "currency",
            currency: currency || "KES",
            maximumFractionDigits: 2,
        }).format(numericAmount);
    } catch {
        return `${new Intl.NumberFormat(languageCode || "en", {
            maximumFractionDigits: 2,
        }).format(numericAmount)} ${currency || "KES"}`;
    }
}

function DashboardSkeleton() {
    return (
        <div className="page-stack page-skeleton" aria-busy="true">
            <span className="sr-only">Loading your dashboard…</span>

            <div className="bp-skeleton skeleton-banner" />

            <div className="kpi-grid">
                {[0, 1, 2, 3].map((item) => (
                    <div className="kpi-card" key={item}>
                        <div className="kpi-card-top">
                            <span
                                className="bp-skeleton bp-skeleton-text"
                                style={{ width: "46%" }}
                            />
                            <span className="bp-skeleton skeleton-icon" />
                        </div>

                        <span className="bp-skeleton skeleton-value" />

                        <span
                            className="bp-skeleton bp-skeleton-text"
                            style={{ width: "62%" }}
                        />
                    </div>
                ))}
            </div>

            <div className="content-grid">
                <div className="panel">
                    <span className="bp-skeleton bp-skeleton-title" />
                    <span
                        className="bp-skeleton skeleton-chart"
                        style={{ marginTop: 20 }}
                    />
                </div>

                <div className="panel">
                    <span className="bp-skeleton bp-skeleton-title" />

                    {[0, 1, 2].map((item) => (
                        <div className="skeleton-row" key={item}>
                            <span className="bp-skeleton skeleton-icon" />

                            <div style={{ flex: 1 }}>
                                <span className="bp-skeleton bp-skeleton-text" />
                                <span
                                    className="bp-skeleton bp-skeleton-text"
                                    style={{ width: "60%", marginTop: 8 }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function downloadTransactions(rows, currency = "KES") {
    if (!rows.length) return;

    const headers = [
        "Transaction ID",
        "Item",
        "Customer",
        "Time",
        "Payment method",
        `Amount (${currency})`,
        "Status",
    ];

    const escapeCell = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
        headers,
        ...rows.map((row) => [
            row.id,
            row.item,
            row.customer,
            row.time,
            row.method,
            row.amount,
            row.status,
        ]),
    ]
        .map((row) => row.map(escapeCell).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bizpilot-transactions.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Dashboard({
    onNavigate,
    onAlert,
    profile,
    preferences,
}) {
    const { data: summary = mockSummary, isLive: summaryIsLive } = useApi(
        getDashboardSummary,
        mockSummary
    );
    const [period, setPeriod] = useState("week");
    const { data: chartData = period === "week" ? salesTrend : monthlyTrend } =
        useApi(
            () => getSalesTrend(period),
            period === "week" ? salesTrend : monthlyTrend,
            [period]
        );
    const { data: alerts = mockAlerts } = useApi(getAlerts, mockAlerts);
    const { data: transactions = mockTx } = useApi(
        () => getTransactions(5),
        mockTx
    );
    const { data: products = mockProducts } = useApi(getProducts, mockProducts);
    const loading = useFirstLoad();

    const [transactionSearch, setTransactionSearch] = useState("");
    const [transactionFilter, setTransactionFilter] = useState("all");
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [notice, setNotice] = useState("");

    const currency = preferences?.currency || "KES";
    const languageCode = preferences?.languageCode || "en";

    const firstName = getFirstName(profile);
    const totalSales = Number(summary?.totalSales ?? mockSummary.totalSales);
    const grossProfit = Number(summary?.grossProfit ?? mockSummary.grossProfit);
    const ordersToday = Number(summary?.ordersToday ?? mockSummary.ordersToday);
    const itemsInStock = products.reduce(
        (total, product) => total + (Number(product.stock) || 0),
        0
    );

    const topProducts = useMemo(
        () =>
            [...products]
                .sort((a, b) => b.sold - a.sold)
                .slice(0, 5),
        [products]
    );

    const lowStockCount = products.filter(
        (product) => product.stock <= product.reorderAt
    ).length;

    const criticalStockCount = products.filter(
        (product) => product.stock <= Math.floor(product.reorderAt / 2)
    ).length;

    const filteredTransactions = useMemo(() => {
        const query = transactionSearch.trim().toLowerCase();

        return transactions.filter((transaction) => {
            const matchesQuery =
                !query ||
                [
                    transaction.id,
                    transaction.item,
                    transaction.customer,
                    transaction.method,
                    transaction.status,
                ].some((value) =>
                    String(value ?? "").toLowerCase().includes(query)
                );

            const matchesStatus =
                transactionFilter === "all" ||
                String(transaction.status ?? "").toLowerCase() ===
                    transactionFilter;

            return matchesQuery && matchesStatus;
        });
    }, [transactionSearch, transactionFilter]);

    const sales = useCountUp(totalSales, !loading);
    const profit = useCountUp(grossProfit, !loading);
    const orders = useCountUp(ordersToday, !loading);
    const stock = useCountUp(itemsInStock, !loading);

    async function handleRefresh() {
        if (refreshing) return;

        setRefreshing(true);
        setNotice("");

        try {
            // Demonstration refresh until a real dashboard API is connected.
            await new Promise((resolve) => window.setTimeout(resolve, 350));

            setLastUpdated(new Date());
            setNotice("Sample dashboard refreshed.");
        } finally {
            setRefreshing(false);
        }
    }

    function handleAlertAction(alert) {
        if (onAlert) {
            onAlert(alert);
            return;
        }

        if (alert.action?.toLowerCase().includes("report")) {
            onNavigate?.("reports");
        } else {
            onNavigate?.("inventory");
        }
    }

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="page-stack dashboard-v2">
            {notice && (
                <div className="dashboard-notice" role="status">
                    <CheckCircle2 size={16} />
                    <span>{notice}</span>

                    <button
                        className="icon-button"
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => setNotice("")}
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            <section className="welcome-banner bp-animate-in">
                <div className="welcome-copy">
                    <span className="welcome-kicker">
                        YOUR BUSINESS AT A GLANCE
                    </span>

                    <h2>
                        {greeting()}, {firstName}
                    </h2>

                    <p>
                        Your business overview, all in one place. Here&apos;s
                        what&apos;s happening today.
                    </p>

                    <div className="welcome-meta">
                        <span>
                            <Clock3 size={14} />
                            Updated{" "}
                            {lastUpdated.toLocaleTimeString(languageCode, {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>

                        <span className="demo-pill">
                            {summaryIsLive ? "LIVE DATA" : "DEMO DATA"}
                        </span>
                    </div>
                </div>
            </section>

            <section className="dashboard-section-heading">
                <div>
                    <span className="eyebrow">YOUR PERFORMANCE</span>
                    <h3>Business overview</h3>
                    <p>Key numbers from your sample business data.</p>
                </div>

                <button
                    className="button button-secondary button-small"
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw
                        size={14}
                        className={refreshing ? "dashboard-spinning" : ""}
                    />
                    {refreshing ? "Refreshing…" : "Refresh"}
                </button>
            </section>

            <section className="kpi-grid">
                <div
                    className="bp-animate-in bp-animate-delay-1"
                    style={{ minWidth: 0 }}
                >
                    <KPICard
                        label="Total sales"
                        value={formatCurrency(sales, currency, languageCode)}
                        change="12.8%"
                        detail="vs. last week"
                        icon={Wallet}
                        tone="green"
                    />
                </div>

                <div
                    className="bp-animate-in bp-animate-delay-2"
                    style={{ minWidth: 0 }}
                >
                    <KPICard
                        label="Gross profit"
                        value={formatCurrency(profit, currency, languageCode)}
                        change="8.2%"
                        detail="vs. last week"
                        icon={Activity}
                        tone="blue"
                    />
                </div>

                <div
                    className="bp-animate-in bp-animate-delay-3"
                    style={{ minWidth: 0 }}
                >
                    <KPICard
                        label="Orders today"
                        value={String(orders)}
                        change="6.4%"
                        detail="vs. yesterday"
                        icon={ShoppingBag}
                        tone="orange"
                    />
                </div>

                <div
                    className="bp-animate-in bp-animate-delay-4"
                    style={{ minWidth: 0 }}
                >
                    <KPICard
                        label="Items in stock"
                        value={stock.toLocaleString(languageCode)}
                        change={`${lowStockCount} need review`}
                        detail="Based on sample products"
                        icon={Boxes}
                        tone="purple"
                        positive={false}
                    />
                </div>
            </section>

            <section className="content-grid chart-content-grid">
                <article className="panel sales-panel bp-animate-in bp-animate-delay-2">
                    <div className="panel-heading">
                        <div>
                            <span className="eyebrow">REVENUE &amp; PROFIT</span>
                            <h3>Sales performance</h3>
                            <p>
                                {period === "week"
                                    ? "Daily performance across the sample week"
                                    : "Sample sales checkpoints across the month"}
                            </p>
                        </div>

                        <div
                            className="dashboard-period-switch"
                            aria-label="Chart period"
                        >
                            <button
                                type="button"
                                className={period === "week" ? "active" : ""}
                                aria-pressed={period === "week"}
                                onClick={() => setPeriod("week")}
                            >
                                <CalendarDays size={14} />
                                Week
                            </button>

                            <button
                                type="button"
                                className={period === "month" ? "active" : ""}
                                aria-pressed={period === "month"}
                                onClick={() => setPeriod("month")}
                            >
                                Month
                            </button>
                        </div>
                    </div>

                    <div className="chart-legend">
                        <span>Sales</span>
                        <span>Gross profit</span>

                        <span className="chart-total">
                            {formatCurrency(
                                chartData.reduce(
                                    (sum, point) => sum + point.sales,
                                    0
                                ),
                                currency,
                                languageCode
                            )}
                            <small> shown period</small>
                        </span>
                    </div>

                    <div className="sales-chart">
                        {chartData.length ? (
                            <SalesChart data={chartData} />
                        ) : (
                            <div className="empty-state">
                                No chart data available.
                            </div>
                        )}
                    </div>
                </article>

                <article className="panel insights-panel bp-animate-in bp-animate-delay-3">
                    <div className="panel-heading">
                        <div>
                            <span className="eyebrow">BUSINESS INSIGHTS</span>
                            <h3>Your business pulse</h3>
                        </div>
                    </div>

                    <div className="insight-score">
                        <div className="score-ring">
                            <span>82</span>
                            <small>/100</small>
                        </div>

                        <div>
                            <strong>Sample health score</strong>
                            <p>
                                Illustrative score, not a live AI assessment.
                            </p>
                        </div>
                    </div>

                    <div className="insight-item">
                        <span className="insight-bullet good">
                            <ArrowUpRight size={14} />
                        </span>

                        <div>
                            <strong>Sales trend is positive</strong>
                            <p>The sample data shows a 12.8% increase.</p>
                        </div>
                    </div>

                    <div className="insight-item">
                        <span className="insight-bullet caution">
                            <TriangleAlert size={14} />
                        </span>

                        <div>
                            <strong>{lowStockCount} products need review</strong>
                            <p>
                                {criticalStockCount
                                    ? `${criticalStockCount} have critically low stock.`
                                    : "Check stock levels before your next reorder."}
                            </p>
                        </div>
                    </div>

                    <button
                        className="button button-primary insight-cta"
                        type="button"
                        onClick={() => onNavigate?.("chat")}
                    >
                        Explore AI assistant <ArrowRight size={15} />
                    </button>
                </article>
            </section>

            <section className="content-grid lower-content-grid">
                <article className="panel bp-animate-in bp-animate-delay-3">
                    <div className="panel-heading">
                        <div>
                            <span className="eyebrow">INVENTORY WATCH</span>
                            <h3>Stock to watch</h3>
                            <p>Items that may need a reorder.</p>
                        </div>

                        <button
                            className="text-action"
                            type="button"
                            onClick={() => onNavigate?.("inventory")}
                        >
                            View inventory <ArrowRight size={14} />
                        </button>
                    </div>

                    <Alerts
                        items={alerts.slice(0, 3)}
                        onAction={handleAlertAction}
                    />

                    <div className="panel-footnote">
                        {lowStockCount} products are at or below their reorder
                        level.
                    </div>
                </article>

                <article className="panel top-products-panel bp-animate-in bp-animate-delay-4">
                    <div className="panel-heading">
                        <div>
                            <span className="eyebrow">PRODUCT PERFORMANCE</span>
                            <h3>Top products</h3>
                            <p>Units sold in the sample data.</p>
                        </div>

                        <button
                            className="icon-button"
                            type="button"
                            onClick={() => onNavigate?.("products")}
                            aria-label="View all products"
                        >
                            <ArrowRight size={17} />
                        </button>
                    </div>

                    <div className="product-chart">
                        {topProducts.length ? (
                            <ProductBarChart data={topProducts} />
                        ) : (
                            <div className="empty-state">
                                No product data available.
                            </div>
                        )}
                    </div>
                </article>
            </section>

            <section className="panel transactions-panel bp-animate-in bp-animate-delay-4">
                <div className="panel-heading dashboard-transactions-heading">
                    <div>
                        <span className="eyebrow">RECENT ACTIVITY</span>
                        <h3>Recent transactions</h3>
                        <p>
                            Search and review the latest sample transactions.
                        </p>
                    </div>

                    <button
                        className="button button-secondary button-small"
                        type="button"
                        onClick={() =>
                            downloadTransactions(filteredTransactions, currency)
                        }
                        disabled={filteredTransactions.length === 0}
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                </div>

                <div className="dashboard-table-controls">
                    <label className="dashboard-search">
                        <Search size={16} />

                        <input
                            type="search"
                            placeholder="Search transaction, item, customer…"
                            value={transactionSearch}
                            onChange={(event) =>
                                setTransactionSearch(event.target.value)
                            }
                            aria-label="Search transactions"
                        />

                        {transactionSearch && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => setTransactionSearch("")}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </label>

                    <label className="dashboard-status-filter">
                        <span className="sr-only">
                            Filter transactions by status
                        </span>

                        <select
                            value={transactionFilter}
                            onChange={(event) =>
                                setTransactionFilter(event.target.value)
                            }
                        >
                            <option value="all">All statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </label>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="empty-state dashboard-empty-state">
                        <Search size={22} />
                        <strong>No matching transactions</strong>
                        <p>Try a different search term or status filter.</p>

                        <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => {
                                setTransactionSearch("");
                                setTransactionFilter("all");
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Transaction</th>
                                    <th scope="col">Item</th>
                                    <th scope="col">Customer</th>
                                    <th scope="col">Time</th>
                                    <th scope="col">Payment</th>
                                    <th scope="col">Amount</th>
                                    <th scope="col">Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td className="table-id">
                                            {transaction.id}
                                        </td>
                                        <td>{transaction.item}</td>
                                        <td>{transaction.customer}</td>
                                        <td className="muted-cell">
                                            {transaction.time}
                                        </td>
                                        <td>
                                            <span
                                                className={`payment-chip payment-${String(
                                                    transaction.method ?? ""
                                                )
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9]/g, "")}`}
                                            >
                                                {transaction.method}
                                            </span>
                                        </td>
                                        <td className="amount-cell">
                                            {formatCurrency(
                                                transaction.amount,
                                                currency,
                                                languageCode
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`status-pill ${
                                                    transaction.status === "Completed"
                                                        ? "status-complete"
                                                        : "status-pending"
                                                }`}
                                            >
                                                {transaction.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="dashboard-table-footer">
                    <span>
                        Showing {filteredTransactions.length} of{" "}
                        {transactions.length} sample transactions
                    </span>

                    <button
                        type="button"
                        className="text-action"
                        onClick={() => onNavigate?.("reports")}
                    >
                        View reports <ArrowRight size={14} />
                    </button>
                </div>
            </section>
        </div>
    );
}