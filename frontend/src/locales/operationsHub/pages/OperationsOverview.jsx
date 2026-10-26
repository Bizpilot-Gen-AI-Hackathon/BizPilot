
import StatCard from "../components/StatCard";
import ActivityFeed from "../components/ActivityFeed";

const quickActions = [
    {
        id: "calls",
        title: "Open Call Centre",
        description:
            "Review customer and supplier calls, assign conversations, and update call statuses.",
        actionLabel: "Manage calls",
    },
    {
        id: "suppliers",
        title: "Manage Suppliers & Stock",
        description:
            "Review supplier information and coordinate stock-related operations.",
        actionLabel: "View suppliers",
    },
    {
        id: "invoices",
        title: "Invoices & Payments",
        description:
            "Create invoices and keep track of outstanding customer balances.",
        actionLabel: "Manage invoices",
    },
    {
        id: "messages",
        title: "Customer Communications",
        description:
            "Prepare SMS, WhatsApp, and email messages for your contacts.",
        actionLabel: "Open messages",
    },
];

export default function OperationsOverview({
    stats = {},
    activities = [],
    onNavigate,
}) {
    const statCards = [
        {
            label: "Pending Calls",
            value: stats.pendingCalls ?? 0,
            detail: "Calls awaiting completion",
            tone: "default",
        },
        {
            label: "Active Suppliers",
            value: stats.activeSuppliers ?? 0,
            detail: "Suppliers marked as active",
            tone: "default",
        },
        {
            label: "Outstanding Invoices",
            value: stats.outstandingInvoices ?? 0,
            detail: "Invoices awaiting payment",
            tone: "warning",
        },
        {
            label: "Outstanding Balance",
            value: stats.outstandingAmountFormatted ?? "KES 0.00",
            detail: "Total unpaid invoice balance",
            tone: "default",
        },
    ];

    function navigateTo(section) {
        if (typeof onNavigate === "function") {
            onNavigate(section);
        }
    }

    return (
        <div className="oh-overview">
            <section className="oh-welcome">
                <div className="oh-welcome-copy">
                    <p className="oh-eyebrow">OPERATIONS DASHBOARD</p>
                    <h2>Your business, in one workspace.</h2>
                    <p>
                        Monitor daily operations, manage customer conversations,
                        coordinate suppliers, and keep invoices moving from one place.
                    </p>
                </div>

                <div className="oh-welcome-meta">
                    <span className="oh-welcome-meta-label">
                        WORKSPACE STATUS
                    </span>
                    <strong>Operations overview</strong>
                    <span>
                        Review your latest recorded activity and tasks.
                    </span>
                </div>
            </section>

            <section className="oh-section">
                <div className="oh-section-heading">
                    <div>
                        <p className="oh-eyebrow">BUSINESS SNAPSHOT</p>
                        <h2>Operational performance</h2>
                        <p>
                            A summary of the records currently available in your workspace.
                        </p>
                    </div>
                </div>

                <div className="oh-stats-grid">
                    {statCards.map((stat) => (
                        <StatCard
                            key={stat.label}
                            label={stat.label}
                            value={stat.value}
                            detail={stat.detail}
                            tone={stat.tone}
                        />
                    ))}
                </div>
            </section>

            <section className="oh-section">
                <div className="oh-section-heading">
                    <div>
                        <p className="oh-eyebrow">WORKSPACE SHORTCUTS</p>
                        <h2>Manage your operations</h2>
                        <p>
                            Open a workspace to continue with a specific task.
                        </p>
                    </div>
                </div>

                <div className="oh-quick-actions">
                    {quickActions.map((item) => (
                        <article
                            className="oh-quick-action"
                            key={item.id}
                        >
                            <div className="oh-quick-action-content">
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                            </div>

                            <button
                                type="button"
                                className="oh-button oh-button-secondary"
                                onClick={() => navigateTo(item.id)}
                                disabled={typeof onNavigate !== "function"}
                            >
                                {item.actionLabel}
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <section className="oh-section oh-overview-activity">
                <ActivityFeed
                    activities={activities}
                    title="Recent operational activity"
                    emptyMessage="No activity has been recorded yet. Actions recorded in the workspace will appear here."
                />
            </section>
        </div>
    );
}
