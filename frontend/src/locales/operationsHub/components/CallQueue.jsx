export default function CallQueue({
    calls = [],
    onAssign,
    onUpdateStatus,
}) {
    return (
        <section className="oh-panel oh-call-queue">
            <div className="oh-panel-header">
                <div>
                    <h2>Call queue</h2>
                    <p>Customer and supplier conversations</p>
                </div>

                <span className="oh-count-badge">
                    {calls.length} {calls.length === 1 ? "call" : "calls"}
                </span>
            </div>

            {calls.length === 0 ? (
                <div className="oh-empty-state">
                    <h3>No calls in the queue</h3>
                    <p>
                        Incoming calls will appear here when call handling
                        is connected.
                    </p>
                </div>
            ) : (
                <div className="oh-table-wrapper">
                    <table className="oh-table">
                        <thead>
                            <tr>
                                <th>Contact</th>
                                <th>Reason</th>
                                <th>Priority</th>
                                <th>Assigned to</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {calls.map((call, index) => (
                                <tr key={call.id ?? index}>
                                    <td>
                                        <div className="oh-table-primary">
                                            {call.contactName ||
                                                "Unknown contact"}
                                        </div>

                                        <div className="oh-table-secondary">
                                            {call.phone || "No phone number"}
                                        </div>
                                    </td>

                                    <td>{call.reason || "Not specified"}</td>

                                    <td>
                                        <span
                                            className={`oh-status oh-status-${String(
                                                call.priority || "normal"
                                            )
                                                .toLowerCase()
                                                .replace(/\s+/g, "-")}`}
                                        >
                                            {call.priority || "Normal"}
                                        </span>
                                    </td>

                                    <td>
                                        {call.assignedTo || "Unassigned"}
                                    </td>

                                    <td>
                                        <span
                                            className={`oh-status oh-status-${String(
                                                call.status || "pending"
                                            )
                                                .toLowerCase()
                                                .replace(/\s+/g, "-")}`}
                                        >
                                            {call.status || "Pending"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="oh-table-actions">
                                            {onAssign && (
                                                <button
                                                    type="button"
                                                    className="oh-button oh-button-secondary"
                                                    onClick={() =>
                                                        onAssign(call)
                                                    }
                                                >
                                                    Assign
                                                </button>
                                            )}

                                            {onUpdateStatus && (
                                                <button
                                                    type="button"
                                                    className="oh-button oh-button-secondary"
                                                    onClick={() =>
                                                        onUpdateStatus(call)
                                                    }
                                                >
                                                    Update status
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}