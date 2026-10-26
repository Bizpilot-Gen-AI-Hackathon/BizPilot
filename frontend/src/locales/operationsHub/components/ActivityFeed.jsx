function formatActivityTime(value) {
    if (!value) {
        return "Time unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
    }).format(date);
}

export default function ActivityFeed({
    activities = [],
    title = "Recent activity",
    emptyMessage = "No activity has been recorded yet.",
}) {
    return (
        <section className="oh-panel oh-activity-panel">
            <div className="oh-panel-header">
                <div>
                    <h2>{title}</h2>
                    <p>Recent updates across your operations</p>
                </div>
            </div>

            {activities.length === 0 ? (
                <div className="oh-empty-state">
                    <p>{emptyMessage}</p>
                </div>
            ) : (
                <div className="oh-activity-list">
                    {activities.map((activity, index) => (
                        <article
                            className="oh-activity-item"
                            key={activity.id ?? `${activity.title}-${index}`}
                        >
                            <span
                                className="oh-activity-marker"
                                aria-hidden="true"
                            />

                            <div className="oh-activity-content">
                                <div className="oh-activity-heading">
                                    <h3>{activity.title}</h3>

                                    {activity.status && (
                                        <span
                                            className={`oh-status oh-status-${String(
                                                activity.status
                                            )
                                                .toLowerCase()
                                                .replace(/\s+/g, "-")}`}
                                        >
                                            {activity.status}
                                        </span>
                                    )}
                                </div>

                                {activity.description && (
                                    <p>{activity.description}</p>
                                )}

                                <time
                                    dateTime={
                                        activity.timestamp
                                            ? new Date(
                                                activity.timestamp
                                            ).toISOString()
                                            : undefined
                                    }
                                >
                                    {formatActivityTime(
                                        activity.timestamp
                                    )}
                                </time>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}