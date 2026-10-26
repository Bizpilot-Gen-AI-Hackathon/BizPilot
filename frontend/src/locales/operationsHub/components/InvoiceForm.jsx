import { useState } from "react";
import { formatCurrency } from "../utils/formatters";

const createEmptyItem = () => ({
    id:
        typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
    description: "",
    quantity: 1,
    unitPrice: 0,
});

export default function InvoiceForm({
    onSubmit,
    submitting = false,
    currency = "KES",
    locale = "en-KE",
    initialValues = {},
}) {
    const [form, setForm] = useState(() => ({
        customerName: initialValues.customerName ?? "",
        customerEmail: initialValues.customerEmail ?? "",
        customerPhone: initialValues.customerPhone ?? "",
        issueDate: initialValues.issueDate ?? new Date().toISOString().slice(0, 10),
        dueDate: initialValues.dueDate ?? "",
        notes: initialValues.notes ?? "",
        items: [createEmptyItem()],
    }));

    const [error, setError] = useState("");

    function updateField(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));

        setError("");
    }

    function updateItem(itemId, field, value) {
        setForm((current) => ({
            ...current,
            items: current.items.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        [field]: value,
                    }
                    : item
            ),
        }));

        setError("");
    }

    function addItem() {
        setForm((current) => ({
            ...current,
            items: [...current.items, createEmptyItem()],
        }));
    }

    function removeItem(itemId) {
        setForm((current) => ({
            ...current,
            items:
                current.items.length > 1
                    ? current.items.filter((item) => item.id !== itemId)
                    : current.items,
        }));

        setError("");
    }

    const subtotal = form.items.reduce((total, item) => {
        const quantity = Math.max(0, Number(item.quantity) || 0);
        const unitPrice = Math.max(0, Number(item.unitPrice) || 0);

        return total + quantity * unitPrice;
    }, 0);

    function handleSubmit(event) {
        event.preventDefault();

        if (!form.customerName.trim()) {
            setError("Enter the customer's name.");
            return;
        }

        if (!form.issueDate) {
            setError("Select the invoice issue date.");
            return;
        }

        if (
            form.dueDate &&
            form.dueDate < form.issueDate
        ) {
            setError("The due date cannot be before the issue date.");
            return;
        }

        const items = form.items.map((item) => ({
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
        }));

        const invalidItem = items.some(
            (item) =>
                !item.description ||
                !Number.isFinite(item.quantity) ||
                item.quantity <= 0 ||
                !Number.isFinite(item.unitPrice) ||
                item.unitPrice < 0
        );

        if (invalidItem) {
            setError(
                "Each item needs a description, a positive quantity, and a valid unit price."
            );
            return;
        }

        if (subtotal <= 0) {
            setError("The invoice total must be greater than zero.");
            return;
        }

        if (typeof onSubmit !== "function") {
            setError("Invoice creation is not connected.");
            return;
        }

        const result = onSubmit({
            customerName: form.customerName.trim(),
            customerEmail: form.customerEmail.trim(),
            customerPhone: form.customerPhone.trim(),
            issueDate: form.issueDate,
            dueDate: form.dueDate,
            notes: form.notes.trim(),
            currency,
            items,
        });

        if (result === null || result === false) {
            setError("The invoice could not be created. Check the details and try again.");
            return;
        }

        setForm({
            customerName: "",
            customerEmail: "",
            customerPhone: "",
            issueDate: new Date().toISOString().slice(0, 10),
            dueDate: "",
            notes: "",
            items: [createEmptyItem()],
        });

        setError("");
    }

    return (
        <section className="oh-panel oh-invoice-form">
            <div className="oh-panel-header">
                <div>
                    <h2>Create invoice</h2>
                    <p>
                        Add customer details and the items being invoiced.
                    </p>
                </div>
            </div>

            <form className="oh-form" onSubmit={handleSubmit}>
                <div className="oh-form-grid">
                    <div className="oh-form-field">
                        <label htmlFor="oh-invoice-customer">
                            Customer name
                        </label>

                        <input
                            id="oh-invoice-customer"
                            type="text"
                            value={form.customerName}
                            onChange={(event) =>
                                updateField(
                                    "customerName",
                                    event.target.value
                                )
                            }
                            placeholder="Enter customer or business name"
                            required
                        />
                    </div>

                    <div className="oh-form-field">
                        <label htmlFor="oh-invoice-email">
                            Email address
                        </label>

                        <input
                            id="oh-invoice-email"
                            type="email"
                            value={form.customerEmail}
                            onChange={(event) =>
                                updateField(
                                    "customerEmail",
                                    event.target.value
                                )
                            }
                            placeholder="customer@example.com"
                        />
                    </div>

                    <div className="oh-form-field">
                        <label htmlFor="oh-invoice-phone">
                            Phone number
                        </label>

                        <input
                            id="oh-invoice-phone"
                            type="tel"
                            value={form.customerPhone}
                            onChange={(event) =>
                                updateField(
                                    "customerPhone",
                                    event.target.value
                                )
                            }
                            placeholder="Customer phone number"
                        />
                    </div>

                    <div className="oh-form-field">
                        <label htmlFor="oh-invoice-issue-date">
                            Issue date
                        </label>

                        <input
                            id="oh-invoice-issue-date"
                            type="date"
                            value={form.issueDate}
                            onChange={(event) =>
                                updateField(
                                    "issueDate",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </div>

                    <div className="oh-form-field">
                        <label htmlFor="oh-invoice-due-date">
                            Due date
                        </label>

                        <input
                            id="oh-invoice-due-date"
                            type="date"
                            min={form.issueDate}
                            value={form.dueDate}
                            onChange={(event) =>
                                updateField(
                                    "dueDate",
                                    event.target.value
                                )
                            }
                        />
                    </div>
                </div>

                <div className="oh-invoice-items">
                    <div className="oh-panel-header">
                        <div>
                            <h3>Invoice items</h3>
                            <p>Add products or services and their prices.</p>
                        </div>

                        <button
                            type="button"
                            className="oh-button oh-button-secondary"
                            onClick={addItem}
                        >
                            Add item
                        </button>
                    </div>

                    {form.items.map((item, index) => (
                        <div
                            className="oh-invoice-item"
                            key={item.id}
                        >
                            <div className="oh-invoice-item-heading">
                                <h4>Item {index + 1}</h4>

                                {form.items.length > 1 && (
                                    <button
                                        type="button"
                                        className="oh-button oh-button-secondary"
                                        onClick={() => removeItem(item.id)}
                                        aria-label={`Remove item ${index + 1}`}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="oh-form-grid">
                                <div className="oh-form-field">
                                    <label
                                        htmlFor={`oh-item-description-${item.id}`}
                                    >
                                        Description
                                    </label>

                                    <input
                                        id={`oh-item-description-${item.id}`}
                                        type="text"
                                        value={item.description}
                                        onChange={(event) =>
                                            updateItem(
                                                item.id,
                                                "description",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Product or service"
                                        required
                                    />
                                </div>

                                <div className="oh-form-field">
                                    <label
                                        htmlFor={`oh-item-quantity-${item.id}`}
                                    >
                                        Quantity
                                    </label>

                                    <input
                                        id={`oh-item-quantity-${item.id}`}
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={item.quantity}
                                        onChange={(event) =>
                                            updateItem(
                                                item.id,
                                                "quantity",
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                </div>

                                <div className="oh-form-field">
                                    <label
                                        htmlFor={`oh-item-price-${item.id}`}
                                    >
                                        Unit price ({currency})
                                    </label>

                                    <input
                                        id={`oh-item-price-${item.id}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(event) =>
                                            updateItem(
                                                item.id,
                                                "unitPrice",
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                </div>

                                <div className="oh-form-field">
                                    <label>Line total</label>

                                    <output className="oh-invoice-line-total">
                                        {formatCurrency(
                                            Math.max(
                                                0,
                                                Number(item.quantity) || 0
                                            ) *
                                            Math.max(
                                                0,
                                                Number(item.unitPrice) || 0
                                            ),
                                            currency,
                                            locale
                                        )}
                                    </output>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="oh-form-field">
                    <label htmlFor="oh-invoice-notes">
                        Notes
                    </label>

                    <textarea
                        id="oh-invoice-notes"
                        rows={3}
                        value={form.notes}
                        onChange={(event) =>
                            updateField("notes", event.target.value)
                        }
                        placeholder="Optional payment terms or additional information"
                    />
                </div>

                <div className="oh-invoice-total">
                    <span>Invoice total</span>

                    <strong>
                        {formatCurrency(subtotal, currency, locale)}
                    </strong>
                </div>

                {error && (
                    <p className="oh-form-error" role="alert">
                        {error}
                    </p>
                )}

                <div className="oh-form-actions">
                    <button
                        type="submit"
                        className="oh-button oh-button-primary"
                        disabled={submitting}
                    >
                        {submitting ? "Creating invoice..." : "Create invoice"}
                    </button>
                </div>
            </form>
        </section>
    );
}