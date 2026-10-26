export default function StatCard({
    label,
    value,
    detail,
    tone = "default",
}) {
    return (
        <article className={`oh-stat-card oh-stat-card-${tone}`}>
            <div className="oh-stat-card-header">
                <p className="oh-stat-label">{label}</p>
            </div>

            <div className="oh-stat-card-body">
                <h3 className="oh-stat-value">{value ?? "—"}</h3>

                {detail && (
                    <p className="oh-stat-detail">{detail}</p>
                )}
            </div>
        </article>
    );
}