
import { useState } from "react";
import SupplierTable from "../components/SupplierTable";
import { formatCurrency } from "../utils/formatters";

const emptySupplier = {
    name: "",
    company: "",
    phone: "",
    email: "",
    productsSupplied: "",
    outstandingBalance: "0",
    status: "Active",
};

export default function Suppliers({
    suppliers = [],
    onAddSupplier,
    onEditSupplier,
    onViewSupplier,
    currency = "KES",
    locale = "en-KE",
}) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptySupplier);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    function updateField(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
        setError("");
        setSuccess("");
    }

    function resetForm() {
        setForm(emptySupplier);
        setEditingId(null);
        setShowForm(false);
        setError("");
    }

    function openAddForm() {
        setForm(emptySupplier);
        setEditingId(null);
        setShowForm(true);
        setError("");
        setSuccess("");
    }

    function openEditForm(supplier) {
        setForm({
            name: supplier.name ?? "",
            company: supplier.company ?? "",
            phone: supplier.phone ?? "",
            email: supplier.email ?? "",
            productsSupplied: Array.isArray(supplier.productsSupplied)
                ? supplier.productsSupplied.join(", ")
                : supplier.productsSupplied ?? "",
            outstandingBalance: String(supplier.outstandingBalance ?? 0),
            status: supplier.status ?? "Active",
        });

        setEditingId(supplier.id);
        setShowForm(true);
        setError("");
        setSuccess("");
    }

    function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name.trim()) {
            setError("Enter the supplier's name.");
            return;
        }

        if (!form.phone.trim() && !form.email.trim()) {
            setError("Enter at least a phone number or an email address.");
            return;
        }

        const outstandingBalance = Number(form.outstandingBalance);

        if (
            !Number.isFinite(outstandingBalance) ||
            outstandingBalance < 0
        ) {
            setError("Enter a valid outstanding balance.");
            return;
        }

        const supplierData = {
            name: form.name.trim(),
            company: form.company.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            productsSupplied: form.productsSupplied
                .split(",")
                .map((product) => product.trim())
                .filter(Boolean),
            outstandingBalance,
            status: form.status,
        };

        const handler = editingId ? onEditSupplier : onAddSupplier;

        if (typeof handler !== "function") {
            setError(
                editingId
                    ? "Supplier editing is not connected."
                    : "Supplier creation is not connected."
            );
            return;
        }

        const result = editingId
            ? handler(editingId, supplierData)
            : handler(supplierData);

        if (result === null || result === false) {
            setError("The supplier could not be saved. Please try again.");
            return;
        }

        setSuccess(
            editingId
                ? "Supplier details updated."
                : "Supplier added successfully."
        );

        resetForm();
    }

    const normalizedSearch = search.trim().toLowerCase();

    const filteredSuppliers = suppliers.filter((supplier) => {
        const searchableText = [
            supplier.name,
            supplier.company,
            supplier.phone,
            supplier.email,
            supplier.status,
            ...(Array.isArray(supplier.productsSupplied)
                ? supplier.productsSupplied
                : [supplier.productsSupplied ?? ""]),
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(normalizedSearch);

        const matchesStatus =
            statusFilter === "All" ||
            String(supplier.status ?? "").toLowerCase() ===
                statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    const activeSuppliers = suppliers.filter(
        (supplier) =>
            String(supplier.status ?? "").toLowerCase() === "active"
    ).length;

    const totalOutstanding = suppliers.reduce((total, supplier) => {
        const balance = Number(supplier.outstandingBalance);
        return total + (Number.isFinite(balance) ? Math.max(0, balance) : 0);
    }, 0);

    return (
        <div className="oh-page oh-suppliers">
            <section className="oh-page-intro">
                <div>
                    <p className="oh-eyebrow">SUPPLY CHAIN OPERATIONS</p>
                    <h2>Suppliers & Stock</h2>
                    <p>
                        Keep supplier contacts organized, review outstanding
                        balances, and maintain a record of supplied products.
                    </p>
                </div>

                <button
                    type="button"
                    className="oh-button oh-button-primary"
                    onClick={openAddForm}
                >
                    Add supplier
                </button>
            </section>

            <section className="oh-stats-grid">
                <article className="oh-stat-card">
                    <div className="oh-stat-card-header">
                        <p className="oh-stat-label">Total suppliers</p>
                    </div>
                    <div className="oh-stat-card-body">
                        <h3 className="oh-stat-value">{suppliers.length}</h3>
                        <p className="oh-stat-detail">Recorded supplier contacts</p>
                    </div>
                </article>

                <article className="oh-stat-card">
                    <div className="oh-stat-card-header">
                        <p className="oh-stat-label">Active suppliers</p>
                    </div>
                    <div className="oh-stat-card-body">
                        <h3 className="oh-stat-value">{activeSuppliers}</h3>
                        <p className="oh-stat-detail">Currently marked active</p>
                    </div>
                </article>

                <article className="oh-stat-card">
                    <div className="oh-stat-card-header">
                        <p className="oh-stat-label">Outstanding balances</p>
                    </div>
                    <div className="oh-stat-card-body">
                        <h3 className="oh-stat-value">
                            {formatCurrency(totalOutstanding, currency, locale)}
                        </h3>
                        <p className="oh-stat-detail">
                            Combined recorded supplier balances
                        </p>
                    </div>
                </article>
            </section>

            {error && (
                <p className="oh-form-error" role="alert">
                    {error}
                </p>
            )}

            {success && (
                <p className="oh-form-success" role="status">
                    {success}
                </p>
            )}

            {showForm && (
                <section className="oh-panel">
                    <div className="oh-panel-header">
                        <div>
                            <h2>
                                {editingId ? "Edit supplier" : "Add supplier"}
                            </h2>
                            <p>
                                Enter the supplier's contact and account details.
                            </p>
                        </div>
                    </div>

                    <form className="oh-form" onSubmit={handleSubmit}>
                        <div className="oh-form-grid">
                            <div className="oh-form-field">
                                <label htmlFor="oh-supplier-name">
                                    Supplier name
                                </label>
                                <input
                                    id="oh-supplier-name"
                                    value={form.name}
                                    onChange={(event) =>
                                        updateField("name", event.target.value)
                                    }
                                    placeholder="Supplier or contact name"
                                    required
                                />
                            </div>

                            <div className="oh-form-field">
                                <label htmlFor="oh-supplier-company">
                                    Company
                                </label>
                                <input
                                    id="oh-supplier-company"
                                    value={form.company}
                                    onChange={(event) =>
                                        updateField("company", event.target.value)
                                    }
                                    placeholder="Company name"
                                />
                            </div>

                            <div className="oh-form-field">
                                <label htmlFor="oh-supplier-phone">
                                    Phone number
                                </label>
                                <input
                                    id="oh-supplier-phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={(event) =>
                                        updateField("phone", event.target.value)
                                    }
                                    placeholder="Supplier phone number"
                                />
                            </div>

                            <div className="oh-form-field">
                                <label htmlFor="oh-supplier-email">
                                    Email address
                                </label>
                                <input
                                    id="oh-supplier-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(event) =>
                                        updateField("email", event.target.value)
                                    }
                                    placeholder="supplier@example.com"
                                />
                            </div>

                            <div className="oh-form-field">
                                <label htmlFor="oh-supplier-products">
                                    Products supplied
                                </label>
                                <input
                                    id="oh-supplier-products"
                                    value={form.productsSupplied}
                                    onChange={(event) =>
                                        updateField(
                                            "productsSupplied",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Flour, sugar, cooking oil"
                                />
                                <p className="oh-field-hint">
                                    Separate product names with commas.
                                </p>
                            </div>

                            <div className="oh-form-field">
                                <label htmlFor="oh-supplier-balance">
                                    Outstanding balance ({currency})
                                </label>
                                <input
                                    id="oh-supplier-balance"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.outstandingBalance}
                                    onChange={(event) =>
                                        updateField(
                                            "outstandingBalance",
                                            event.target.value
                                        )
                                    }
                                    required
                                />
                            </div>

                            <div className="oh-form-field">
                                <label htmlFor="oh-supplier-status">
                                    Supplier status
                                </label>
                                <select
                                    id="oh-supplier-status"
                                    value={form.status}
                                    onChange={(event) =>
                                        updateField("status", event.target.value)
                                    }
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                        </div>

                        <div className="oh-form-actions">
                            <button
                                type="button"
                                className="oh-button oh-button-secondary"
                                onClick={resetForm}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="oh-button oh-button-primary"
                            >
                                {editingId ? "Save changes" : "Add supplier"}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="oh-panel">
                <div className="oh-panel-header">
                    <div>
                        <h2>Supplier directory</h2>
                        <p>
                            Search your suppliers and review their recorded details.
                        </p>
                    </div>
                </div>

                <div className="oh-toolbar">
                    <div className="oh-form-field oh-toolbar-search">
                        <label htmlFor="oh-supplier-search">
                            Search suppliers
                        </label>
                        <input
                            id="oh-supplier-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by name, company, phone, or product"
                        />
                    </div>

                    <div className="oh-form-field oh-toolbar-filter">
                        <label htmlFor="oh-supplier-status-filter">
                            Filter by status
                        </label>
                        <select
                            id="oh-supplier-status-filter"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="All">All suppliers</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>

                <SupplierTable
                    suppliers={filteredSuppliers}
                    onView={onViewSupplier}
                    onEdit={openEditForm}
                />

                {filteredSuppliers.length === 0 && (
                    <div className="oh-empty-state">
                        <p>No suppliers match your search.</p>
                        <span>
                            Try another search or add a supplier to the directory.
                        </span>
                    </div>
                )}
            </section>

            <p className="oh-page-note">
                Supplier balances and supplied products are recorded workspace
                data. Live inventory synchronization and supplier payments require
                connection to the relevant BizPilot systems.
            </p>
        </div>
    );
}
