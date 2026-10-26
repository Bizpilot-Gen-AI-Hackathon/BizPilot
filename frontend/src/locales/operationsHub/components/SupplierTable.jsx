export default function SupplierTable({
    suppliers = [],
    onView,
    onEdit,
}) {
    return (
        <section className="oh-panel oh-supplier-table">
            <div className="oh-panel-header">
                <div>
                    <h2>Suppliers</h2>
                    <p>Manage supplier contacts and purchasing relationships</p>
                </div>

                <span className="oh-count-badge">
                    {suppliers.length}{" "}
                    {suppliers.length === 1 ? "supplier" : "suppliers"}
                </span>
            </div>

            {suppliers.length === 0 ? (
                <div className="oh-empty-state">
                    <h3>No suppliers added</h3>
                    <p>
                        Add supplier records to manage contact details and
                        purchasing relationships.
                    </p>
                </div>
            ) : (
                <div className="oh-table-wrapper">
                    <table className="oh-table">
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th>Contact</th>
                                <th>Products supplied</th>
                                <th>Outstanding balance</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {suppliers.map((supplier, index) => (
                                <tr key={supplier.id ?? index}>
                                    <td>
                                        <div className="oh-table-primary">
                                            {supplier.name ||
                                                "Unnamed supplier"}
                                        </div>

                                        <div className="oh-table-secondary">
                                            {supplier.company ||
                                                supplier.category ||
                                                "Supplier"}
                                        </div>
                                    </td>

                                    <td>
                                        <div>
                                            {supplier.phone || "No phone"}
                                        </div>

                                        <div className="oh-table-secondary">
                                            {supplier.email || "No email"}
                                        </div>
                                    </td>

                                    <td>
                                        {supplier.productsSupplied ??
                                            supplier.productCount ??
                                            "—"}
                                    </td>

                                    <td>
                                        {supplier.outstandingBalance ??
                                            "—"}
                                    </td>

                                    <td>
                                        <span
                                            className={`oh-status oh-status-${String(
                                                supplier.status || "active"
                                            )
                                                .toLowerCase()
                                                .replace(/\s+/g, "-")}`}
                                        >
                                            {supplier.status || "Active"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="oh-table-actions">
                                            {onView && (
                                                <button
                                                    type="button"
                                                    className="oh-button oh-button-secondary"
                                                    onClick={() =>
                                                        onView(supplier)
                                                    }
                                                >
                                                    View
                                                </button>
                                            )}

                                            {onEdit && (
                                                <button
                                                    type="button"
                                                    className="oh-button oh-button-secondary"
                                                    onClick={() =>
                                                        onEdit(supplier)
                                                    }
                                                >
                                                    Edit
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