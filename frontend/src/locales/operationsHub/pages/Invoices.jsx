import { useEffect, useMemo, useState } from "react";
import InvoiceForm from "../components/InvoiceForm";
import {
    formatCurrency,
    formatDate,
    formatStatus,
    getStatusClass,
} from "../utils/formatters";

/* ====================================================================
   Invoices & Account Statements
   Connections are unchanged:
   - props: invoices, onCreateInvoice, onRecordPayment, currency, locale
   - onCreateInvoice(data)            -> via <InvoiceForm onSubmit>
   - onRecordPayment(invoiceId, amount)
   - formatters: formatCurrency, formatDate, formatStatus, getStatusClass
   New (all derived from the invoices prop, nothing persisted):
   - Status chips with live counts, sorting, pagination, CSV export
   - Due-date awareness ("due in 3 days", "12 days overdue")
   - Payment progress bars, row menu, quick-pay buttons
   - Invoice drawer with timeline, reminders (WhatsApp / email)
   - Payment modal with quick amounts and balance preview
   - Statement customer list with balances and period presets
   - Financial summary: collection rate, ageing buckets, status mix,
     top debtors
   ==================================================================== */

const STATUS_CHIPS = [
    "All",
    "Draft",
    "Pending",
    "Unpaid",
    "Partially Paid",
    "Paid",
    "Overdue",
    "Cancelled",
];

const SORTS = [
    ["newest", "Newest first"],
    ["oldest", "Oldest first"],
    ["due", "Due soonest"],
    ["amount", "Highest amount"],
    ["balance", "Highest balance"],
    ["customer", "Customer A–Z"],
];

const METHODS = ["M-Pesa", "Bank transfer", "Cash", "Card", "Other"];
const PAGE_SIZE = 10;
const DAY = 86400000;

const AVATAR_COLORS = [
    ["#e3f4ea", "#12683f"], ["#e5eefb", "#2c5a9e"], ["#fdeede", "#a35a14"],
    ["#f0e9fb", "#6a46a8"], ["#fde8ea", "#b23a48"], ["#e1f4f4", "#17727a"],
];

function avatarColors(name = "") {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name = "") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "#";
    return (
        (parts[0][0] || "") +
        (parts.length > 1 ? parts[parts.length - 1][0] : "")
    ).toUpperCase();
}

function Avatar({ name, size = 38 }) {
    const [bg, fg] = avatarColors(name);
    return (
        <span
            className="inv-avatar"
            style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
            aria-hidden="true"
        >
            {initials(name)}
        </span>
    );
}

function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function Invoices({
    invoices = [],
    onCreateInvoice,
    onRecordPayment,
    currency = "KES",
    locale = "en-KE",
}) {
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("M-Pesa");
    const [paymentReference, setPaymentReference] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [activeTab, setActiveTab] = useState("invoices");
    const [statementCustomer, setStatementCustomer] = useState("");
    const [statementStart, setStatementStart] = useState("");
    const [statementEnd, setStatementEnd] = useState("");
    const [statementSearch, setStatementSearch] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [page, setPage] = useState(1);
    const [menuId, setMenuId] = useState(null);

    const normalizedSearch = search.trim().toLowerCase();

    const safeInvoices = Array.isArray(invoices) ? invoices : [];

    /* ================================================================
       Calculation helpers (unchanged logic)
       ================================================================ */

    function getInvoiceTotal(invoice) {
        const explicitTotal = Number(invoice?.total);

        if (
            invoice?.total !== undefined &&
            invoice?.total !== null &&
            invoice?.total !== "" &&
            Number.isFinite(explicitTotal)
        ) {
            return Math.max(0, explicitTotal);
        }

        const explicitAmount = Number(invoice?.amount);

        if (
            invoice?.amount !== undefined &&
            invoice?.amount !== null &&
            invoice?.amount !== "" &&
            Number.isFinite(explicitAmount)
        ) {
            return Math.max(0, explicitAmount);
        }

        if (Array.isArray(invoice?.items)) {
            return invoice.items.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice =
                    Number(item.unitPrice ?? item.unit_price ?? item.price) ||
                    0;

                return sum + Math.max(0, quantity * unitPrice);
            }, 0);
        }

        return 0;
    }

    function getPaidAmount(invoice) {
        const paid = Number(
            invoice?.amountPaid ?? invoice?.paidAmount ?? 0
        );

        return Number.isFinite(paid) ? Math.max(0, paid) : 0;
    }

    function getBalance(invoice) {
        const explicitBalance = Number(
            invoice?.balance ?? invoice?.outstandingBalance
        );

        if (
            (invoice?.balance !== undefined &&
                invoice?.balance !== null &&
                invoice?.balance !== "") ||
            (invoice?.outstandingBalance !== undefined &&
                invoice?.outstandingBalance !== null &&
                invoice?.outstandingBalance !== "")
        ) {
            if (Number.isFinite(explicitBalance)) {
                return Math.max(0, explicitBalance);
            }
        }

        return Math.max(0, getInvoiceTotal(invoice) - getPaidAmount(invoice));
    }

    function getEffectiveStatus(invoice) {
        const status = String(invoice?.status || "").trim().toLowerCase();
        const balance = getBalance(invoice);

        if (status === "cancelled" || status === "void") return "Cancelled";
        if (status === "draft") return "Draft";
        if (balance <= 0 && getInvoiceTotal(invoice) > 0) return "Paid";

        if (
            invoice?.dueDate &&
            balance > 0 &&
            new Date(`${invoice.dueDate}T23:59:59`).getTime() < Date.now()
        ) {
            return "Overdue";
        }

        if (getPaidAmount(invoice) > 0) return "Partially Paid";

        return invoice?.status || "Unpaid";
    }

    function getCustomerName(invoice) {
        return (
            invoice?.customerName ||
            invoice?.customer?.name ||
            "Unnamed customer"
        );
    }

    function getCustomerKey(invoice) {
        return String(
            invoice?.customerId ??
            invoice?.customer?.id ??
            invoice?.customerEmail ??
            invoice?.customerPhone ??
            getCustomerName(invoice)
        )
            .trim()
            .toLowerCase();
    }

    function getInvoiceNumber(invoice) {
        return invoice?.invoiceNumber || invoice?.id || "Unnumbered";
    }

    function getLineItems(invoice) {
        if (Array.isArray(invoice?.items) && invoice.items.length > 0) {
            return invoice.items.map((item) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice =
                    Number(item.unitPrice ?? item.unit_price ?? item.price) ||
                    0;

                return {
                    description:
                        item.description ||
                        item.name ||
                        item.title ||
                        "Service",
                    quantity,
                    unitPrice,
                    total:
                        Number.isFinite(Number(item.total)) &&
                            item.total !== undefined
                            ? Number(item.total)
                            : quantity * unitPrice,
                };
            });
        }

        return [
            {
                description:
                    invoice?.description ||
                    invoice?.service ||
                    "Services supplied",
                quantity: 1,
                unitPrice: getInvoiceTotal(invoice),
                total: getInvoiceTotal(invoice),
            },
        ];
    }

    function getPayments(invoice) {
        if (!Array.isArray(invoice?.payments)) return [];

        return invoice.payments
            .filter((payment) => payment && typeof payment === "object")
            .map((payment) => ({
                date: payment.date || payment.paymentDate || "",
                amount: Math.max(0, Number(payment.amount) || 0),
                method: payment.method || payment.paymentMethod || "Payment",
                reference:
                    payment.reference ||
                    payment.transactionReference ||
                    payment.transactionId ||
                    "—",
                status: payment.status || "Recorded",
            }));
    }

    /* ---------- small presentation helpers (new, read-only) ---------- */

    function money(value) {
        return formatCurrency(value, currency, locale);
    }

    function dueInfo(invoice) {
        const status = getEffectiveStatus(invoice);
        if (!invoice?.dueDate) return { label: "No due date", tone: "" };
        const due = new Date(`${invoice.dueDate}T23:59:59`).getTime();
        if (!Number.isFinite(due)) return { label: "No due date", tone: "" };
        if (status === "Paid") return { label: "Settled", tone: "ok" };
        if (status === "Cancelled" || status === "Draft") return { label: "", tone: "" };
        const days = Math.ceil((due - Date.now()) / DAY);
        if (days < 0) {
            const late = Math.abs(days);
            return { label: `${late} day${late === 1 ? "" : "s"} overdue`, tone: "bad" };
        }
        if (days === 0) return { label: "Due today", tone: "warn" };
        if (days <= 7) return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, tone: "warn" };
        return { label: `Due in ${days} days`, tone: "" };
    }

    function issueTimestamp(invoice) {
        const t = new Date(invoice?.issueDate || invoice?.createdAt || 0).getTime();
        return Number.isFinite(t) ? t : 0;
    }

    function matchesStatusChip(invoice, chip) {
        if (chip === "All") return true;
        return (
            getEffectiveStatus(invoice).toLowerCase() === chip.toLowerCase() ||
            String(invoice.status || "").toLowerCase() === chip.toLowerCase()
        );
    }

    /* ================================================================
       Derived data
       ================================================================ */

    const filteredInvoices = useMemo(() => {
        const list = safeInvoices.filter((invoice) => {
            const searchableText = [
                invoice.invoiceNumber,
                invoice.customerName,
                invoice.customerEmail,
                invoice.customerPhone,
                getEffectiveStatus(invoice),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = searchableText.includes(normalizedSearch);
            const effectiveStatus = getEffectiveStatus(invoice).toLowerCase();

            const matchesStatus =
                statusFilter === "All" ||
                effectiveStatus === statusFilter.toLowerCase() ||
                String(invoice.status || "").toLowerCase() ===
                statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });

        const dueTs = (inv) => {
            const t = new Date(`${inv.dueDate}T23:59:59`).getTime();
            return Number.isFinite(t) ? t : Infinity;
        };

        return [...list].sort((a, b) => {
            switch (sortBy) {
                case "oldest": return issueTimestamp(a) - issueTimestamp(b);
                case "due": return dueTs(a) - dueTs(b);
                case "amount": return getInvoiceTotal(b) - getInvoiceTotal(a);
                case "balance": return getBalance(b) - getBalance(a);
                case "customer": return getCustomerName(a).localeCompare(getCustomerName(b));
                default: return issueTimestamp(b) - issueTimestamp(a);
            }
        });
    }, [safeInvoices, normalizedSearch, statusFilter, sortBy]);

    const statusCounts = useMemo(() => {
        const counts = {};
        STATUS_CHIPS.forEach((chip) => {
            counts[chip] = safeInvoices.filter((inv) => matchesStatusChip(inv, chip)).length;
        });
        return counts;
    }, [safeInvoices]);

    const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const pagedInvoices = filteredInvoices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const totals = useMemo(() => {
        const activeInvoices = safeInvoices.filter(
            (invoice) => getEffectiveStatus(invoice) !== "Cancelled"
        );

        const overdue = activeInvoices.filter(
            (invoice) => getEffectiveStatus(invoice) === "Overdue"
        );

        return {
            count: safeInvoices.length,
            invoiced: activeInvoices.reduce(
                (sum, invoice) => sum + getInvoiceTotal(invoice),
                0
            ),
            outstanding: activeInvoices.reduce(
                (sum, invoice) => sum + getBalance(invoice),
                0
            ),
            paid: activeInvoices.reduce(
                (sum, invoice) => sum + getPaidAmount(invoice),
                0
            ),
            overdueCount: overdue.length,
            overdueAmount: overdue.reduce(
                (sum, invoice) => sum + getBalance(invoice),
                0
            ),
        };
    }, [safeInvoices]);

    const collectionRate = totals.invoiced > 0
        ? Math.min(100, Math.round((totals.paid / totals.invoiced) * 100))
        : 0;

    const customers = useMemo(() => {
        const map = new Map();

        safeInvoices.forEach((invoice) => {
            const key = getCustomerKey(invoice);

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    name: getCustomerName(invoice),
                    email: invoice.customerEmail || invoice.customer?.email || "",
                    phone: invoice.customerPhone || invoice.customer?.phone || "",
                    invoices: [],
                });
            }

            map.get(key).invoices.push(invoice);
        });

        return Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [safeInvoices]);

    function customerBalance(customer) {
        return customer.invoices.reduce(
            (sum, invoice) =>
                sum + (getEffectiveStatus(invoice) === "Cancelled" ? 0 : getBalance(invoice)),
            0
        );
    }

    const selectedCustomer =
        customers.find((customer) => customer.key === statementCustomer) ||
        null;

    const statementEntries = useMemo(() => {
        if (!selectedCustomer) return [];

        const entries = [];

        selectedCustomer.invoices.forEach((invoice) => {
            const issueDate = invoice.issueDate || invoice.createdAt || "";
            const issueTime = issueDate ? new Date(issueDate).getTime() : 0;

            if (getEffectiveStatus(invoice) !== "Cancelled") {
                entries.push({
                    type: "invoice",
                    date: issueDate,
                    timestamp: Number.isFinite(issueTime) ? issueTime : 0,
                    reference: getInvoiceNumber(invoice),
                    description: `Invoice ${getInvoiceNumber(invoice)}`,
                    debit: getInvoiceTotal(invoice),
                    credit: 0,
                    invoice,
                });
            }

            getPayments(invoice).forEach((payment, index) => {
                const paymentDate = payment.date || issueDate;
                const paymentTime = paymentDate
                    ? new Date(paymentDate).getTime()
                    : 0;

                entries.push({
                    type: "payment",
                    date: paymentDate,
                    timestamp: Number.isFinite(paymentTime) ? paymentTime : 0,
                    reference: payment.reference || `${getInvoiceNumber(invoice)}-PAY-${index + 1}`,
                    description: `Payment for ${getInvoiceNumber(invoice)} (${payment.method})`,
                    debit: 0,
                    credit: payment.amount,
                    invoice,
                    payment,
                });
            });

            // When legacy invoice records contain an amount paid but no payment
            // entries, display an explicitly identified summary entry.
            if (
                getPaidAmount(invoice) > 0 &&
                getPayments(invoice).length === 0
            ) {
                entries.push({
                    type: "payment-summary",
                    date: invoice.updatedAt || issueDate,
                    timestamp: new Date(invoice.updatedAt || issueDate).getTime() || 0,
                    reference: `${getInvoiceNumber(invoice)}-PAYMENTS`,
                    description: `Recorded payments for ${getInvoiceNumber(invoice)} (payment breakdown unavailable)`,
                    debit: 0,
                    credit: getPaidAmount(invoice),
                    invoice,
                });
            }
        });

        return entries.sort((a, b) => a.timestamp - b.timestamp);
    }, [selectedCustomer, statementStart, statementEnd]);

    const statementRows = useMemo(() => {
        if (!statementEntries.length) return [];

        const periodStart = statementStart
            ? new Date(`${statementStart}T00:00:00`).getTime()
            : -Infinity;
        const periodEnd = statementEnd
            ? new Date(`${statementEnd}T23:59:59`).getTime()
            : Infinity;

        let openingBalance = 0;

        statementEntries.forEach((entry) => {
            if (entry.timestamp < periodStart) {
                openingBalance += entry.debit - entry.credit;
            }
        });

        let runningBalance = openingBalance;

        const rows = statementEntries
            .filter(
                (entry) =>
                    entry.timestamp >= periodStart &&
                    entry.timestamp <= periodEnd
            )
            .map((entry) => {
                runningBalance += entry.debit - entry.credit;

                return {
                    ...entry,
                    runningBalance,
                };
            });

        return rows.map((row) => ({
            ...row,
            openingBalance,
        }));
    }, [statementEntries, statementStart, statementEnd]);

    const statementTotals = useMemo(() => {
        const openingBalance = statementEntries
            .filter((entry) => {
                const periodStart = statementStart
                    ? new Date(`${statementStart}T00:00:00`).getTime()
                    : -Infinity;
                return entry.timestamp < periodStart;
            })
            .reduce((sum, entry) => sum + entry.debit - entry.credit, 0);

        return {
            openingBalance,
            debits: statementRows.reduce((sum, row) => sum + row.debit, 0),
            credits: statementRows.reduce((sum, row) => sum + row.credit, 0),
            closingBalance:
                openingBalance +
                statementRows.reduce(
                    (sum, row) => sum + row.debit - row.credit,
                    0
                ),
        };
    }, [statementEntries, statementRows, statementStart]);

    const visibleCustomers = customers.filter((customer) =>
        `${customer.name} ${customer.email} ${customer.phone}`
            .toLowerCase()
            .includes(statementSearch.trim().toLowerCase())
    );

    /* ---------- ageing + status mix for the financial summary ---------- */

    const ageing = useMemo(() => {
        const buckets = [
            { key: "current", label: "Not yet due", amount: 0, count: 0 },
            { key: "d30", label: "1–30 days", amount: 0, count: 0 },
            { key: "d60", label: "31–60 days", amount: 0, count: 0 },
            { key: "d90", label: "61–90 days", amount: 0, count: 0 },
            { key: "d90p", label: "90+ days", amount: 0, count: 0 },
        ];

        safeInvoices.forEach((invoice) => {
            if (getEffectiveStatus(invoice) === "Cancelled") return;
            const balance = getBalance(invoice);
            if (balance <= 0) return;

            const due = invoice.dueDate
                ? new Date(`${invoice.dueDate}T23:59:59`).getTime()
                : NaN;
            const late = Number.isFinite(due) ? Math.floor((Date.now() - due) / DAY) : -1;

            const bucket =
                late <= 0 ? buckets[0]
                    : late <= 30 ? buckets[1]
                        : late <= 60 ? buckets[2]
                            : late <= 90 ? buckets[3]
                                : buckets[4];

            bucket.amount += balance;
            bucket.count += 1;
        });

        return buckets;
    }, [safeInvoices]);

    const statusMix = useMemo(() => {
        const labels = ["Paid", "Partially Paid", "Unpaid", "Overdue", "Draft", "Cancelled"];
        const counts = {};
        safeInvoices.forEach((invoice) => {
            const s = getEffectiveStatus(invoice);
            const key = labels.includes(s) ? s : "Unpaid";
            counts[key] = (counts[key] || 0) + 1;
        });
        return labels
            .map((label) => ({ label, count: counts[label] || 0 }))
            .filter((row) => row.count > 0);
    }, [safeInvoices]);

    /* ================================================================
       Handlers (same contracts)
       ================================================================ */

    function handleCreateInvoice(data) {
        setError("");
        setSuccess("");

        if (typeof onCreateInvoice !== "function") {
            setError("Invoice creation is not connected to the workspace.");
            return false;
        }

        try {
            const result = onCreateInvoice(data);

            if (result === null || result === false) {
                setError("The invoice could not be created. Please try again.");
                return false;
            }

            setShowForm(false);
            setSuccess("Invoice created successfully.");
            return result;
        } catch (err) {
            setError(err?.message || "The invoice could not be created.");
            return false;
        }
    }

    function openPaymentForm(invoice) {
        setPaymentInvoice(invoice);
        setPaymentAmount("");
        setPaymentMethod("M-Pesa");
        setPaymentReference("");
        setError("");
        setSuccess("");
        setMenuId(null);
    }

    function closePaymentForm() {
        setPaymentInvoice(null);
        setPaymentAmount("");
        setPaymentReference("");
    }

    function handleRecordPayment(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const amount = Number(paymentAmount);
        const balance = paymentInvoice ? getBalance(paymentInvoice) : 0;

        if (!paymentInvoice) {
            setError("Select an invoice before recording a payment.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Enter a valid payment amount greater than zero.");
            return;
        }

        if (amount > balance) {
            setError("The payment cannot exceed the outstanding balance.");
            return;
        }

        if (typeof onRecordPayment !== "function") {
            setError("Payment recording is not connected to the workspace.");
            return;
        }

        try {
            // Preserve the existing handler contract: (invoiceId, amount).
            // Method/reference fields are collected for the operator but cannot
            // be persisted unless the existing handler supports them.
            const result = onRecordPayment(paymentInvoice.id, amount);

            if (result === null || result === false) {
                setError("The payment could not be recorded.");
                return;
            }

            setSuccess(
                `Payment of ${formatCurrency(amount, currency, locale)} submitted to the workspace handler.`
            );
            closePaymentForm();
        } catch (err) {
            setError(err?.message || "The payment could not be recorded.");
        }
    }

    /* ================================================================
       Documents (print / CSV / share) - unchanged logic
       ================================================================ */

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function documentStyles() {
        return `
            @page { size: A4; margin: 18mm; }
            * { box-sizing: border-box; }
            body {
                font-family: Arial, Helvetica, sans-serif;
                color: #20352c;
                font-size: 12px;
                line-height: 1.55;
                margin: 0;
            }
            .brand {
                color: #137653;
                font-size: 24px;
                font-weight: 800;
                letter-spacing: .3px;
            }
            .muted { color: #65746d; }
            .top {
                display: flex;
                justify-content: space-between;
                gap: 24px;
                padding-bottom: 18px;
                border-bottom: 2px solid #137653;
            }
            h1 { margin: 0 0 6px; font-size: 24px; }
            h2 { margin: 20px 0 8px; font-size: 15px; }
            .meta { text-align: right; }
            .two {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin: 22px 0;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th {
                background: #eaf3ed;
                color: #20352c;
                text-align: left;
                font-weight: 700;
            }
            th, td { padding: 9px 8px; border-bottom: 1px solid #dfe7e1; }
            .right { text-align: right; }
            .summary { width: 310px; margin: 18px 0 0 auto; }
            .summary td { border: 0; padding: 5px 0; }
            .grand { font-size: 15px; font-weight: 800; border-top: 2px solid #137653; }
            .notice {
                margin-top: 24px; padding: 12px; background: #f1f6f2;
                border-radius: 6px;
            }
            .footer {
                border-top: 1px solid #dfe7e1;
                margin-top: 32px; padding-top: 12px;
                color: #65746d; font-size: 10px;
            }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        `;
    }

    function openPrintableDocument(title, content) {
        const win = window.open("", "_blank");

        if (!win) {
            setError(
                "The document window was blocked. Allow pop-ups for BizPilot, then try again."
            );
            return;
        }

        win.document.open();
        win.document.write(`
            <!doctype html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${escapeHtml(title)}</title>
                <style>${documentStyles()}</style>
            </head>
            <body>${content}</body>
            </html>
        `);
        win.document.close();
        win.focus();

        setTimeout(() => {
            win.print();
        }, 250);
    }

    function invoiceDocument(invoice) {
        const items = getLineItems(invoice);
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const total = getInvoiceTotal(invoice);
        const paid = getPaidAmount(invoice);
        const balance = getBalance(invoice);
        const tax = Number(invoice.taxAmount ?? invoice.tax ?? 0) || 0;
        const discount = Number(invoice.discountAmount ?? invoice.discount ?? 0) || 0;
        const businessName =
            invoice.businessName ||
            invoice.companyName ||
            "Business name";
        const businessEmail = invoice.businessEmail || invoice.companyEmail || "";
        const businessPhone = invoice.businessPhone || invoice.companyPhone || "";
        const businessAddress = invoice.businessAddress || invoice.companyAddress || "";

        const rows = items
            .map(
                (item) => `
                    <tr>
                        <td>${escapeHtml(item.description)}</td>
                        <td class="right">${item.quantity}</td>
                        <td class="right">${escapeHtml(money(item.unitPrice))}</td>
                        <td class="right">${escapeHtml(money(item.total))}</td>
                    </tr>`
            )
            .join("");

        const paymentRows = getPayments(invoice)
            .map(
                (payment) => `
                    <tr>
                        <td>${escapeHtml(formatDate(payment.date, locale))}</td>
                        <td>${escapeHtml(payment.method)}</td>
                        <td>${escapeHtml(payment.reference)}</td>
                        <td class="right">${escapeHtml(money(payment.amount))}</td>
                    </tr>`
            )
            .join("");

        return `
            <div class="top">
                <div>
                    <div class="brand">${escapeHtml(businessName)}</div>
                    <div class="muted">${escapeHtml(businessAddress)}</div>
                    <div class="muted">${escapeHtml(businessEmail)}</div>
                    <div class="muted">${escapeHtml(businessPhone)}</div>
                </div>
                <div class="meta">
                    <h1>INVOICE</h1>
                    <strong>${escapeHtml(getInvoiceNumber(invoice))}</strong>
                    <div class="muted">Status: ${escapeHtml(getEffectiveStatus(invoice))}</div>
                    <div>Issued: ${escapeHtml(formatDate(invoice.issueDate, locale))}</div>
                    <div>Due: ${escapeHtml(formatDate(invoice.dueDate, locale))}</div>
                </div>
            </div>
            <div class="two">
                <div>
                    <strong class="muted">BILL TO</strong>
                    <h2>${escapeHtml(getCustomerName(invoice))}</h2>
                    <div>${escapeHtml(invoice.customerAddress || invoice.customer?.address || "")}</div>
                    <div>${escapeHtml(invoice.customerEmail || invoice.customer?.email || "")}</div>
                    <div>${escapeHtml(invoice.customerPhone || invoice.customer?.phone || "")}</div>
                    <div>${invoice.customerTaxPin ? `Tax PIN: ${escapeHtml(invoice.customerTaxPin)}` : ""}</div>
                </div>
                <div>
                    <strong class="muted">PAYMENT TERMS</strong>
                    <p>${escapeHtml(invoice.paymentTerms || "Please pay by the due date shown above.")}</p>
                    <p>${escapeHtml(invoice.notes || "")}</p>
                </div>
            </div>
            <table>
                <thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Amount</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <table class="summary">
                <tr><td>Items subtotal</td><td class="right">${escapeHtml(money(subtotal))}</td></tr>
                ${discount ? `<tr><td>Discount</td><td class="right">−${escapeHtml(money(discount))}</td></tr>` : ""}
                <tr><td>Tax</td><td class="right">${escapeHtml(money(tax))}</td></tr>
                <tr class="grand"><td>Invoice total</td><td class="right">${escapeHtml(money(total))}</td></tr>
                <tr><td>Payments recorded</td><td class="right">${escapeHtml(money(paid))}</td></tr>
                <tr><td><strong>Balance due</strong></td><td class="right"><strong>${escapeHtml(money(balance))}</strong></td></tr>
            </table>
            ${paymentRows
                ? `<h2>Payment history</h2>
                    <table>
                        <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="right">Amount</th></tr></thead>
                        <tbody>${paymentRows}</tbody>
                    </table>`
                : ""
            }
            <div class="notice">
                <strong>Payment instructions</strong>
                <p>${escapeHtml(invoice.paymentInstructions || "Use the business's verified payment details and include the invoice number as the payment reference.")}</p>
                <div>${invoice.bankName ? `Bank: ${escapeHtml(invoice.bankName)}` : ""}</div>
                <div>${invoice.bankAccount ? `Account: ${escapeHtml(invoice.bankAccount)}` : ""}</div>
                <div>${invoice.mpesaPaybill ? `M-Pesa Paybill: ${escapeHtml(invoice.mpesaPaybill)}` : ""}</div>
                <div>${invoice.mpesaTill ? `M-Pesa Till: ${escapeHtml(invoice.mpesaTill)}` : ""}</div>
            </div>
            <div class="footer">
                Generated from BizPilot using the invoice information available in this workspace.
                Verify the business, tax, and payment details before sending.
            </div>
        `;
    }

    function printInvoice(invoice) {
        setError("");
        setMenuId(null);
        openPrintableDocument(
            `Invoice-${getInvoiceNumber(invoice)}`,
            invoiceDocument(invoice)
        );
    }

    function statementDocument() {
        if (!selectedCustomer) return "";

        const rows = statementRows
            .map(
                (row) => `
                    <tr>
                        <td>${escapeHtml(formatDate(row.date, locale))}</td>
                        <td>${escapeHtml(row.reference)}</td>
                        <td>${escapeHtml(row.description)}</td>
                        <td class="right">${row.debit ? escapeHtml(money(row.debit)) : "—"}</td>
                        <td class="right">${row.credit ? escapeHtml(money(row.credit)) : "—"}</td>
                        <td class="right">${escapeHtml(money(row.runningBalance))}</td>
                    </tr>`
            )
            .join("");

        const period =
            `${statementStart || "Beginning"} to ${statementEnd || "Current"}`;

        return `
            <div class="top">
                <div>
                    <div class="brand">ACCOUNT STATEMENT</div>
                    <div class="muted">Customer account activity</div>
                </div>
                <div class="meta">
                    <h1>STATEMENT</h1>
                    <div>${escapeHtml(period)}</div>
                    <div class="muted">Generated ${escapeHtml(formatDate(new Date(), locale))}</div>
                </div>
            </div>
            <div class="two">
                <div>
                    <strong class="muted">CUSTOMER</strong>
                    <h2>${escapeHtml(selectedCustomer.name)}</h2>
                    <div>${escapeHtml(selectedCustomer.email)}</div>
                    <div>${escapeHtml(selectedCustomer.phone)}</div>
                </div>
                <div>
                    <strong class="muted">ACCOUNT SUMMARY</strong>
                    <p>Opening balance: <strong>${escapeHtml(money(statementTotals.openingBalance))}</strong></p>
                    <p>Charges: <strong>${escapeHtml(money(statementTotals.debits))}</strong></p>
                    <p>Payments/credits: <strong>${escapeHtml(money(statementTotals.credits))}</strong></p>
                    <p>Closing balance: <strong>${escapeHtml(money(statementTotals.closingBalance))}</strong></p>
                </div>
            </div>
            <table>
                <thead>
                    <tr><th>Date</th><th>Reference</th><th>Description</th><th class="right">Charges</th><th class="right">Payments</th><th class="right">Balance</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="5"><strong>Opening balance</strong></td>
                        <td class="right"><strong>${escapeHtml(money(statementTotals.openingBalance))}</strong></td>
                    </tr>
                    ${rows || `<tr><td colspan="6">No transactions in the selected period.</td></tr>`}
                </tbody>
            </table>
            <table class="summary">
                <tr><td>Total charges</td><td class="right">${escapeHtml(money(statementTotals.debits))}</td></tr>
                <tr><td>Total payments</td><td class="right">${escapeHtml(money(statementTotals.credits))}</td></tr>
                <tr class="grand"><td>Closing balance</td><td class="right">${escapeHtml(money(statementTotals.closingBalance))}</td></tr>
            </table>
            <div class="footer">
                This statement reflects the invoice and payment records available in BizPilot.
                Please reconcile it with verified payment records before treating it as an official accounting statement.
            </div>
        `;
    }

    function printStatement() {
        if (!selectedCustomer) {
            setError("Choose a customer to generate an account statement.");
            return;
        }

        setError("");
        openPrintableDocument(
            `Statement-${selectedCustomer.name.replace(/[^a-z0-9-_]/gi, "-")}`,
            statementDocument()
        );
    }

    function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    function downloadStatementCsv() {
        if (!selectedCustomer) {
            setError("Choose a customer before exporting a statement.");
            return;
        }

        const csvCell = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const lines = [
            [
                "Date",
                "Reference",
                "Description",
                `Charges (${currency})`,
                `Payments (${currency})`,
                `Running balance (${currency})`,
            ],
            [
                "",
                "",
                "Opening balance",
                "",
                "",
                statementTotals.openingBalance,
            ],
            ...statementRows.map((row) => [
                row.date,
                row.reference,
                row.description,
                row.debit,
                row.credit,
                row.runningBalance,
            ]),
            [],
            ["Total charges", statementTotals.debits],
            ["Total payments", statementTotals.credits],
            ["Closing balance", statementTotals.closingBalance],
        ];

        const csv = lines
            .map((line) => line.map(csvCell).join(","))
            .join("\r\n");

        downloadTextFile(
            `Statement-${selectedCustomer.name.replace(/[^a-z0-9-_]/gi, "-")}.csv`,
            `\uFEFF${csv}`,
            "text/csv;charset=utf-8"
        );

        setSuccess("Customer statement CSV downloaded.");
    }

    /* New: export the (filtered) invoice register */
    function downloadInvoicesCsv() {
        if (!filteredInvoices.length) {
            setError("There are no invoices to export for the current filters.");
            return;
        }

        const csvCell = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const lines = [
            [
                "Invoice",
                "Customer",
                "Email",
                "Phone",
                "Issue date",
                "Due date",
                `Total (${currency})`,
                `Paid (${currency})`,
                `Balance (${currency})`,
                "Status",
            ],
            ...filteredInvoices.map((invoice) => [
                getInvoiceNumber(invoice),
                getCustomerName(invoice),
                invoice.customerEmail || "",
                invoice.customerPhone || "",
                invoice.issueDate || "",
                invoice.dueDate || "",
                getInvoiceTotal(invoice),
                getPaidAmount(invoice),
                getBalance(invoice),
                getEffectiveStatus(invoice),
            ]),
        ];

        downloadTextFile(
            `Invoices-${toISO(new Date())}.csv`,
            `\uFEFF${lines.map((line) => line.map(csvCell).join(",")).join("\r\n")}`,
            "text/csv;charset=utf-8"
        );
        setError("");
        setSuccess(`Exported ${filteredInvoices.length} invoice${filteredInvoices.length === 1 ? "" : "s"} to CSV.`);
    }

    function buildShareText(invoice) {
        return [
            `INVOICE ${getInvoiceNumber(invoice)}`,
            `Business: ${invoice.businessName || invoice.companyName || "Business"}`,
            `Customer: ${getCustomerName(invoice)}`,
            `Issued: ${formatDate(invoice.issueDate, locale)}`,
            `Due: ${formatDate(invoice.dueDate, locale)}`,
            `Total: ${money(getInvoiceTotal(invoice))}`,
            `Paid: ${money(getPaidAmount(invoice))}`,
            `Balance due: ${money(getBalance(invoice))}`,
            "",
            "This summary was prepared from BizPilot invoice records.",
        ].join("\n");
    }

    function buildReminderText(invoice) {
        const info = dueInfo(invoice);
        return [
            `Hello ${getCustomerName(invoice)},`,
            "",
            `This is a friendly reminder that invoice ${getInvoiceNumber(invoice)} has an outstanding balance of ${money(getBalance(invoice))}` +
            (invoice.dueDate ? ` (due ${formatDate(invoice.dueDate, locale)}${info.tone === "bad" ? `, ${info.label}` : ""}).` : "."),
            "",
            "Please make payment using the details on the invoice and quote the invoice number as the reference. If you have already paid, kindly share the transaction code so we can update our records.",
            "",
            "Thank you.",
        ].join("\n");
    }

    async function shareInvoice(invoice, platform) {
        setError("");
        setSuccess("");

        const text = buildShareText(invoice);
        const title = `Invoice ${getInvoiceNumber(invoice)}`;

        if (platform === "native") {
            if (navigator.share) {
                try {
                    await navigator.share({ title, text });
                    setSuccess("Share dialog opened.");
                } catch (err) {
                    if (err?.name !== "AbortError") {
                        setError("Sharing was cancelled or is unavailable.");
                    }
                }
                return;
            }

            await copyText(text);
            return;
        }

        if (platform === "whatsapp") {
            window.open(
                `https://wa.me/?text=${encodeURIComponent(text)}`,
                "_blank",
                "noopener,noreferrer"
            );
            setSuccess("WhatsApp share link opened. Attach the PDF separately if required.");
            return;
        }

        if (platform === "telegram") {
            window.open(
                `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`,
                "_blank",
                "noopener,noreferrer"
            );
            setSuccess("Telegram share link opened. Attach the PDF separately if required.");
            return;
        }

        if (platform === "instagram") {
            await copyText(text);
            setSuccess(
                "Invoice summary copied. Instagram does not reliably support direct PDF attachment from this page; download the PDF and attach it using a supported workflow."
            );
        }
    }

    /* New: payment reminders (WhatsApp straight to the customer, or email) */
    function sendReminder(invoice, channel) {
        setError("");
        setSuccess("");
        setMenuId(null);

        const text = buildReminderText(invoice);

        if (channel === "whatsapp") {
            const digits = String(invoice.customerPhone || invoice.customer?.phone || "")
                .replace(/[^\d]/g, "")
                .replace(/^0/, "254");
            const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
            window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
            setSuccess("WhatsApp reminder opened. Review it before sending.");
            return;
        }

        const email = invoice.customerEmail || invoice.customer?.email || "";
        const subject = `Payment reminder: invoice ${getInvoiceNumber(invoice)}`;
        window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
        setSuccess("Email reminder opened in your mail app. Review it before sending.");
    }

    async function copyText(text, message = "Invoice summary copied to clipboard.") {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                textarea.remove();
            }

            setSuccess(message);
        } catch {
            setError("Could not copy the summary. Please select and copy it manually.");
        }
    }

    function openStatementFor(invoice) {
        setStatementCustomer(getCustomerKey(invoice));
        setActiveTab("statements");
        setSelectedInvoice(null);
        setMenuId(null);
        setError("");
        setSuccess("");
    }

    function applyPreset(preset) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();

        if (preset === "all") { setStatementStart(""); setStatementEnd(""); return; }
        if (preset === "month") {
            setStatementStart(toISO(new Date(y, m, 1)));
            setStatementEnd(toISO(new Date(y, m + 1, 0)));
        }
        if (preset === "last") {
            setStatementStart(toISO(new Date(y, m - 1, 1)));
            setStatementEnd(toISO(new Date(y, m, 0)));
        }
        if (preset === "quarter") {
            const q = Math.floor(m / 3) * 3;
            setStatementStart(toISO(new Date(y, q, 1)));
            setStatementEnd(toISO(new Date(y, q + 3, 0)));
        }
        if (preset === "year") {
            setStatementStart(toISO(new Date(y, 0, 1)));
            setStatementEnd(toISO(new Date(y, 11, 31)));
        }
    }

    /* ---------- keyboard + outside click ---------- */

    useEffect(() => {
        function onKey(event) {
            if (event.key !== "Escape") return;
            if (menuId) { setMenuId(null); return; }
            if (paymentInvoice) { closePaymentForm(); return; }
            if (selectedInvoice) setSelectedInvoice(null);
        }
        function onClick() { setMenuId(null); }
        window.addEventListener("keydown", onKey);
        window.addEventListener("click", onClick);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("click", onClick);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menuId, paymentInvoice, selectedInvoice]);

    /* ================================================================
       Render helpers
       ================================================================ */

    function StatusPill({ invoice }) {
        const status = getEffectiveStatus(invoice);
        return (
            <span className={`oh-status oh-status-${getStatusClass(status)} inv-pill`}>
                {formatStatus(status)}
            </span>
        );
    }

    function ProgressBar({ invoice }) {
        const total = getInvoiceTotal(invoice);
        const pct = total > 0 ? Math.min(100, Math.round((getPaidAmount(invoice) / total) * 100)) : 0;
        return (
            <span className="inv-bar" role="img" aria-label={`${pct}% paid`}>
                <i style={{ width: `${pct}%` }} />
            </span>
        );
    }

    function canPay(invoice) {
        return getBalance(invoice) > 0 && getEffectiveStatus(invoice) !== "Cancelled";
    }

    function canRemind(invoice) {
        return canPay(invoice) && getEffectiveStatus(invoice) !== "Draft";
    }

    const tabs = [
        ["invoices", "Invoices", totals.count],
        ["statements", "Customer statements", customers.length],
        ["reports", "Financial summary", null],
    ];

    const payAmountNumber = Number(paymentAmount);
    const payBalance = paymentInvoice ? getBalance(paymentInvoice) : 0;
    const payRemaining = Number.isFinite(payAmountNumber) && payAmountNumber > 0
        ? payBalance - payAmountNumber
        : null;

    const maxAging = Math.max(1, ...ageing.map((b) => b.amount));
    const debtors = customers
        .map((c) => ({ ...c, balance: customerBalance(c) }))
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance);
    const debtorTotal = debtors.reduce((s, c) => s + c.balance, 0);

    return (
        <div className="oh-page oh-invoices inv">
            <style>{invStyles}</style>

            {/* ---------------- header ---------------- */}
            <section className="oh-page-intro">
                <div>
                    <p className="oh-eyebrow">FINANCE & BILLING</p>
                    <h2>Invoices & Account Statements</h2>
                    <p>
                        Create invoices, track payment progress, manage
                        outstanding balances, and prepare customer statements
                        for sharing or download.
                    </p>
                </div>
                <button
                    type="button"
                    className="oh-button oh-button-primary"
                    onClick={() => {
                        setShowForm((current) => !current);
                        setError("");
                        setSuccess("");
                    }}
                >
                    {showForm ? "Close invoice form" : "+ Create invoice"}
                </button>
            </section>

            {/* ---------------- KPIs ---------------- */}
            <section className="inv-kpis" aria-label="Billing overview">
                <article className="inv-kpi">
                    <span className="inv-kpi-icon">▤</span>
                    <div>
                        <small>Total invoiced</small>
                        <strong>{money(totals.invoiced)}</strong>
                        <em>{totals.count} invoice{totals.count === 1 ? "" : "s"} · excludes cancelled</em>
                    </div>
                </article>
                <article className="inv-kpi ok">
                    <span className="inv-kpi-icon">✓</span>
                    <div>
                        <small>Payments recorded</small>
                        <strong>{money(totals.paid)}</strong>
                        <span className="inv-bar big" role="img" aria-label={`${collectionRate}% collected`}><i style={{ width: `${collectionRate}%` }} /></span>
                        <em>{collectionRate}% of invoiced collected</em>
                    </div>
                </article>
                <article className="inv-kpi warn">
                    <span className="inv-kpi-icon">◔</span>
                    <div>
                        <small>Outstanding balance</small>
                        <strong>{money(totals.outstanding)}</strong>
                        <em>Still to be collected</em>
                    </div>
                </article>
                <article className={`inv-kpi ${totals.overdueCount ? "bad" : ""}`}>
                    <span className="inv-kpi-icon">!</span>
                    <div>
                        <small>Overdue</small>
                        <strong>{money(totals.overdueAmount)}</strong>
                        <em>{totals.overdueCount} overdue invoice{totals.overdueCount === 1 ? "" : "s"}</em>
                    </div>
                </article>
            </section>

            {/* ---------------- tabs ---------------- */}
            <nav className="inv-tabs" aria-label="Finance sections" role="tablist">
                {tabs.map(([id, label, count]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === id}
                        className={`inv-tab ${activeTab === id ? "on" : ""}`}
                        onClick={() => setActiveTab(id)}
                    >
                        {label}
                        {count !== null && <em>{count}</em>}
                    </button>
                ))}
            </nav>

            {error && (
                <p className="inv-banner bad" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")} aria-label="Dismiss">✕</button>
                </p>
            )}
            {success && (
                <p className="inv-banner ok" role="status">
                    <span>{success}</span>
                    <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss">✕</button>
                </p>
            )}

            {showForm && (
                <div className="inv-formwrap">
                    <InvoiceForm
                        onSubmit={handleCreateInvoice}
                        currency={currency}
                        locale={locale}
                    />
                </div>
            )}

            {/* ================= INVOICES ================= */}
            {activeTab === "invoices" && (
                <section className="inv-card" key="invoices">
                    <header className="inv-card-head">
                        <div>
                            <h3>Invoice register</h3>
                            <p>Search, inspect, print, share, and record payments against invoices.</p>
                        </div>
                        <button type="button" className="oh-button oh-button-secondary" onClick={downloadInvoicesCsv}>
                            ⭳ Export CSV
                        </button>
                    </header>

                    <div className="inv-toolbar">
                        <label className="inv-search">
                            <span aria-hidden="true">⌕</span>
                            <input
                                id="oh-invoice-search"
                                type="search"
                                value={search}
                                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                                placeholder="Search invoice number, customer, email…"
                                aria-label="Search invoices"
                            />
                        </label>
                        <label className="inv-sort">
                            <span>Sort</span>
                            <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} aria-label="Sort invoices">
                                {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className="inv-chips" role="group" aria-label="Filter by status">
                        {STATUS_CHIPS.map((chip) => (
                            <button
                                key={chip}
                                type="button"
                                className={`inv-chip ${statusFilter === chip ? "on" : ""}`}
                                aria-pressed={statusFilter === chip}
                                onClick={() => { setStatusFilter(chip); setPage(1); }}
                            >
                                {chip === "All" ? "All statuses" : chip}
                                <em>{statusCounts[chip]}</em>
                            </button>
                        ))}
                    </div>

                    {filteredInvoices.length === 0 ? (
                        <div className="inv-empty">
                            <span className="inv-empty-icon">▤</span>
                            <strong>No invoices found</strong>
                            <p>Create an invoice or adjust your search and filters.</p>
                            {(search || statusFilter !== "All") && (
                                <button type="button" className="oh-button oh-button-secondary" onClick={() => { setSearch(""); setStatusFilter("All"); setPage(1); }}>
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="inv-table-wrap">
                                <table className="inv-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Customer</th>
                                            <th>Due</th>
                                            <th className="num">Total</th>
                                            <th className="num">Balance</th>
                                            <th>Status</th>
                                            <th className="act">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedInvoices.map((invoice, index) => {
                                            const info = dueInfo(invoice);
                                            const rowKey = invoice.id ?? getInvoiceNumber(invoice);
                                            const open = menuId === rowKey;
                                            return (
                                                <tr key={rowKey} className={getEffectiveStatus(invoice) === "Overdue" ? "late" : ""}>
                                                    <td data-label="Invoice">
                                                        <button type="button" className="inv-link" onClick={() => setSelectedInvoice(invoice)}>
                                                            {getInvoiceNumber(invoice)}
                                                        </button>
                                                        <small>{formatDate(invoice.issueDate, locale)}</small>
                                                    </td>
                                                    <td data-label="Customer">
                                                        <div className="inv-cust">
                                                            <Avatar name={getCustomerName(invoice)} size={34} />
                                                            <div>
                                                                <strong>{getCustomerName(invoice)}</strong>
                                                                {invoice.customerEmail && <small>{invoice.customerEmail}</small>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td data-label="Due">
                                                        <span>{formatDate(invoice.dueDate, locale)}</span>
                                                        {info.label && <small className={`inv-due ${info.tone}`}>{info.label}</small>}
                                                    </td>
                                                    <td className="num" data-label="Total">{money(getInvoiceTotal(invoice))}</td>
                                                    <td className="num" data-label="Balance">
                                                        <strong>{money(getBalance(invoice))}</strong>
                                                        <ProgressBar invoice={invoice} />
                                                        <small>{money(getPaidAmount(invoice))} paid</small>
                                                    </td>
                                                    <td data-label="Status"><StatusPill invoice={invoice} /></td>
                                                    <td className="act" data-label="Actions">
                                                        <div className="inv-actions" onClick={(e) => e.stopPropagation()}>
                                                            {canPay(invoice) && (
                                                                <button type="button" className="oh-button oh-button-primary inv-sm" onClick={() => openPaymentForm(invoice)}>
                                                                    Record payment
                                                                </button>
                                                            )}
                                                            <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => setSelectedInvoice(invoice)}>
                                                                View
                                                            </button>
                                                            <div className="inv-menu-wrap">
                                                                <button
                                                                    type="button"
                                                                    className="oh-button oh-button-secondary inv-sm inv-dots"
                                                                    aria-haspopup="menu"
                                                                    aria-expanded={open}
                                                                    aria-label={`More actions for ${getInvoiceNumber(invoice)}`}
                                                                    onClick={() => setMenuId(open ? null : rowKey)}
                                                                >⋯</button>
                                                                {open && (
                                                                    <div className={`inv-menu ${index >= pagedInvoices.length - 2 && pagedInvoices.length > 3 ? "up" : ""}`} role="menu">
                                                                        <button type="button" role="menuitem" onClick={() => printInvoice(invoice)}>Print / PDF</button>
                                                                        <button type="button" role="menuitem" onClick={() => openStatementFor(invoice)}>Customer statement</button>
                                                                        {canRemind(invoice) && <button type="button" role="menuitem" onClick={() => sendReminder(invoice, "whatsapp")}>Remind on WhatsApp</button>}
                                                                        {canRemind(invoice) && <button type="button" role="menuitem" onClick={() => sendReminder(invoice, "email")}>Remind by email</button>}
                                                                        <button type="button" role="menuitem" onClick={() => { copyText(String(getInvoiceNumber(invoice)), "Invoice number copied."); setMenuId(null); }}>Copy invoice number</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <footer className="inv-pager">
                                <span>
                                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
                                </span>
                                <div>
                                    <button type="button" className="oh-button oh-button-secondary inv-sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>← Previous</button>
                                    <b>{safePage} / {pageCount}</b>
                                    <button type="button" className="oh-button oh-button-secondary inv-sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Next →</button>
                                </div>
                            </footer>
                        </>
                    )}
                </section>
            )}

            {/* ================= STATEMENTS ================= */}
            {activeTab === "statements" && (
                <section className="inv-card" key="statements">
                    <header className="inv-card-head">
                        <div>
                            <h3>Customer account statements</h3>
                            <p>Review a customer's invoice activity, payments, and running account balance for a selected period.</p>
                        </div>
                    </header>

                    <div className="inv-split">
                        <aside className="inv-customers" aria-label="Customers">
                            <label className="inv-search">
                                <span aria-hidden="true">⌕</span>
                                <input
                                    id="oh-statement-customer-search"
                                    type="search"
                                    value={statementSearch}
                                    onChange={(event) => setStatementSearch(event.target.value)}
                                    placeholder="Find customer…"
                                    aria-label="Find customer"
                                />
                            </label>
                            <div className="inv-customer-list">
                                {visibleCustomers.length === 0 && <p className="inv-muted pad">No customers match.</p>}
                                {visibleCustomers.map((customer) => {
                                    const bal = customerBalance(customer);
                                    return (
                                        <button
                                            key={customer.key}
                                            type="button"
                                            className={`inv-customer ${statementCustomer === customer.key ? "on" : ""}`}
                                            onClick={() => setStatementCustomer(customer.key)}
                                            aria-pressed={statementCustomer === customer.key}
                                        >
                                            <Avatar name={customer.name} size={36} />
                                            <span>
                                                <strong>{customer.name}</strong>
                                                <small>{customer.invoices.length} invoice{customer.invoices.length === 1 ? "" : "s"}</small>
                                            </span>
                                            <b className={bal > 0 ? "due" : "clear"}>{bal > 0 ? money(bal) : "Settled"}</b>
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        <div className="inv-statement">
                            {!selectedCustomer ? (
                                <div className="inv-empty">
                                    <span className="inv-empty-icon">☰</span>
                                    <strong>Select a customer</strong>
                                    <p>Customer statements are assembled from the invoices and payment entries available here.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="inv-stmt-head">
                                        <div className="inv-cust">
                                            <Avatar name={selectedCustomer.name} size={46} />
                                            <div>
                                                <h3>{selectedCustomer.name}</h3>
                                                <p>
                                                    {selectedCustomer.email || "No email recorded"}
                                                    {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="inv-actions">
                                            <button type="button" className="oh-button oh-button-primary" onClick={printStatement}>Print / Save as PDF</button>
                                            <button type="button" className="oh-button oh-button-secondary" onClick={downloadStatementCsv}>Download CSV</button>
                                        </div>
                                    </div>

                                    <div className="inv-period">
                                        <div className="inv-dates">
                                            <label htmlFor="oh-statement-start">
                                                From
                                                <input id="oh-statement-start" type="date" value={statementStart} max={statementEnd || undefined} onChange={(event) => setStatementStart(event.target.value)} />
                                            </label>
                                            <label htmlFor="oh-statement-end">
                                                To
                                                <input id="oh-statement-end" type="date" value={statementEnd} min={statementStart || undefined} onChange={(event) => setStatementEnd(event.target.value)} />
                                            </label>
                                        </div>
                                        <div className="inv-chips tight">
                                            {[["all", "All time"], ["month", "This month"], ["last", "Last month"], ["quarter", "This quarter"], ["year", "This year"]].map(([k, label]) => (
                                                <button key={k} type="button" className="inv-chip" onClick={() => applyPreset(k)}>{label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="inv-mini-kpis">
                                        <div><small>Opening balance</small><strong>{money(statementTotals.openingBalance)}</strong></div>
                                        <div><small>Charges in period</small><strong>{money(statementTotals.debits)}</strong></div>
                                        <div><small>Payments in period</small><strong className="okc">{money(statementTotals.credits)}</strong></div>
                                        <div className="hi"><small>Closing balance</small><strong>{money(statementTotals.closingBalance)}</strong></div>
                                    </div>

                                    <div className="inv-table-wrap">
                                        <table className="inv-table compact">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Reference</th>
                                                    <th>Description</th>
                                                    <th className="num">Charges</th>
                                                    <th className="num">Payments</th>
                                                    <th className="num">Running balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="open-row">
                                                    <td colSpan={5}><strong>Opening balance</strong></td>
                                                    <td className="num"><strong>{money(statementTotals.openingBalance)}</strong></td>
                                                </tr>
                                                {statementRows.map((row, index) => (
                                                    <tr key={`${row.reference}-${index}`}>
                                                        <td>{formatDate(row.date, locale)}</td>
                                                        <td>{row.reference}</td>
                                                        <td>
                                                            <span className={`inv-type ${row.type === "invoice" ? "inv" : "pay"}`}>{row.type === "invoice" ? "Invoice" : "Payment"}</span>
                                                            {row.description}
                                                        </td>
                                                        <td className="num">{row.debit ? money(row.debit) : "—"}</td>
                                                        <td className="num okc">{row.credit ? money(row.credit) : "—"}</td>
                                                        <td className="num"><strong>{money(row.runningBalance)}</strong></td>
                                                    </tr>
                                                ))}
                                                {statementRows.length === 0 && (
                                                    <tr><td colSpan={6} className="inv-muted pad">No transactions found in this period.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <p className="inv-note">
                                        A reliable statement requires individual payment entries. Where only a paid total exists, BizPilot identifies it as a payment summary rather than inventing transaction dates or references.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ================= SUMMARY ================= */}
            {activeTab === "reports" && (
                <div className="inv-reports" key="reports">
                    <section className="inv-card">
                        <header className="inv-card-head">
                            <div>
                                <h3>Receivables ageing</h3>
                                <p>How long outstanding balances have been unpaid, measured from the due date.</p>
                            </div>
                        </header>
                        <div className="inv-aging">
                            {ageing.map((bucket) => (
                                <div key={bucket.key} className={`inv-age ${bucket.key}`}>
                                    <span className="inv-age-bar"><i style={{ height: `${Math.max(bucket.amount ? 6 : 0, (bucket.amount / maxAging) * 100)}%` }} /></span>
                                    <strong>{money(bucket.amount)}</strong>
                                    <small>{bucket.label}</small>
                                    <em>{bucket.count} invoice{bucket.count === 1 ? "" : "s"}</em>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="inv-two">
                        <section className="inv-card">
                            <header className="inv-card-head">
                                <div>
                                    <h3>Collection progress</h3>
                                    <p>{money(totals.paid)} collected of {money(totals.invoiced)} invoiced.</p>
                                </div>
                            </header>
                            <div className="inv-ring-row">
                                <div className="inv-ring" style={{ "--p": collectionRate }} role="img" aria-label={`${collectionRate}% collected`}>
                                    <b>{collectionRate}%</b>
                                </div>
                                <ul className="inv-legend">
                                    {statusMix.length === 0 && <li className="inv-muted">No invoices yet.</li>}
                                    {statusMix.map((row) => (
                                        <li key={row.label}>
                                            <span className={`oh-status oh-status-${getStatusClass(row.label)} inv-pill`}>{formatStatus(row.label)}</span>
                                            <b>{row.count}</b>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        <section className="inv-card">
                            <header className="inv-card-head">
                                <div>
                                    <h3>Top debtors</h3>
                                    <p>Customers with the largest outstanding balances.</p>
                                </div>
                            </header>
                            {debtors.length === 0 ? (
                                <p className="inv-muted pad">No outstanding balances. 🎉</p>
                            ) : (
                                <ul className="inv-debtors">
                                    {debtors.slice(0, 5).map((c) => (
                                        <li key={c.key}>
                                            <Avatar name={c.name} size={32} />
                                            <div>
                                                <strong>{c.name}</strong>
                                                <span className="inv-bar"><i style={{ width: `${debtorTotal ? (c.balance / debtorTotal) * 100 : 0}%` }} /></span>
                                            </div>
                                            <b>{money(c.balance)}</b>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    <section className="inv-card">
                        <header className="inv-card-head">
                            <div>
                                <h3>Customer breakdown</h3>
                                <p>A snapshot of the billing information currently available in the workspace.</p>
                            </div>
                        </header>
                        <div className="inv-table-wrap">
                            <table className="inv-table compact">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th className="num">Invoices</th>
                                        <th className="num">Total invoiced</th>
                                        <th className="num">Paid</th>
                                        <th className="num">Outstanding</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.length === 0 && (
                                        <tr><td colSpan={6} className="inv-muted pad">No customers yet.</td></tr>
                                    )}
                                    {customers.map((customer) => {
                                        const customerTotal = customer.invoices.reduce(
                                            (sum, invoice) =>
                                                sum +
                                                (getEffectiveStatus(invoice) === "Cancelled"
                                                    ? 0
                                                    : getInvoiceTotal(invoice)),
                                            0
                                        );
                                        const customerPaid = customer.invoices.reduce(
                                            (sum, invoice) => sum + getPaidAmount(invoice),
                                            0
                                        );
                                        const balance = customerBalance(customer);

                                        return (
                                            <tr key={customer.key}>
                                                <td><div className="inv-cust"><Avatar name={customer.name} size={30} /><strong>{customer.name}</strong></div></td>
                                                <td className="num">{customer.invoices.length}</td>
                                                <td className="num">{money(customerTotal)}</td>
                                                <td className="num okc">{money(customerPaid)}</td>
                                                <td className="num"><strong>{money(balance)}</strong></td>
                                                <td className="act">
                                                    <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => { setStatementCustomer(customer.key); setActiveTab("statements"); }}>Statement</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}

            <p className="oh-page-note">
                Financial totals are calculated from the invoice records supplied
                by the workspace. This page does not independently verify payments,
                initiate M-Pesa transactions, transmit email/SMS, or guarantee
                permanent storage. Use Print / Save as PDF and choose Save as PDF
                in the browser's print dialog to download a document.
            </p>

            {/* ================= PAYMENT MODAL ================= */}
            {paymentInvoice && (
                <div className="inv-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closePaymentForm(); }}>
                    <section className="inv-modal" role="dialog" aria-modal="true" aria-label="Record payment">
                        <header className="inv-modal-head">
                            <div>
                                <h3>Record payment</h3>
                                <p>Invoice {getInvoiceNumber(paymentInvoice)} · {getCustomerName(paymentInvoice)}</p>
                            </div>
                            <button type="button" className="inv-x" onClick={closePaymentForm} aria-label="Close">✕</button>
                        </header>

                        <div className="oh-payment-summary inv-pay-sum">
                            <div>
                                <span>Outstanding balance</span>
                                <strong>{money(payBalance)}</strong>
                            </div>
                            <ProgressBar invoice={paymentInvoice} />
                            <small>{money(getPaidAmount(paymentInvoice))} of {money(getInvoiceTotal(paymentInvoice))} already paid</small>
                        </div>

                        <form className="inv-form" onSubmit={handleRecordPayment}>
                            <div className="inv-field">
                                <label htmlFor="oh-payment-amount">Amount received ({currency})</label>
                                <input
                                    id="oh-payment-amount"
                                    type="number"
                                    min="0.01"
                                    max={payBalance}
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(event) => setPaymentAmount(event.target.value)}
                                    placeholder="Enter amount received"
                                    autoFocus
                                    required
                                />
                                <div className="inv-chips tight">
                                    {[["25%", 0.25], ["50%", 0.5], ["75%", 0.75], ["Full balance", 1]].map(([label, f]) => (
                                        <button
                                            key={label}
                                            type="button"
                                            className="inv-chip"
                                            onClick={() => setPaymentAmount(String(Math.round(payBalance * f * 100) / 100))}
                                        >{label}</button>
                                    ))}
                                </div>
                                {payRemaining !== null && (
                                    <small className={`inv-after ${payRemaining < 0 ? "bad" : ""}`}>
                                        {payRemaining < 0
                                            ? "This is more than the outstanding balance."
                                            : payRemaining === 0
                                                ? "This payment will settle the invoice in full."
                                                : `Balance after this payment: ${money(payRemaining)}`}
                                    </small>
                                )}
                            </div>

                            <div className="inv-field">
                                <label htmlFor="oh-payment-method">Payment method</label>
                                <select id="oh-payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                                    {METHODS.map((m) => <option key={m}>{m}</option>)}
                                </select>
                            </div>

                            <div className="inv-field">
                                <label htmlFor="oh-payment-reference">Transaction reference (optional)</label>
                                <input
                                    id="oh-payment-reference"
                                    value={paymentReference}
                                    onChange={(event) => setPaymentReference(event.target.value)}
                                    placeholder="e.g. M-Pesa transaction code"
                                />
                                <small className="inv-muted">
                                    Method and reference are collected here, but this existing payment handler accepts only the invoice ID and amount. They will not be saved unless that handler is extended.
                                </small>
                            </div>

                            <div className="inv-modal-actions">
                                <button type="button" className="oh-button oh-button-secondary" onClick={closePaymentForm}>Cancel</button>
                                <button type="submit" className="oh-button oh-button-primary">Record payment</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* ================= INVOICE DRAWER ================= */}
            {selectedInvoice && (
                <div className="inv-backdrop side" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedInvoice(null); }}>
                    <aside className="inv-drawer" role="dialog" aria-modal="true" aria-label="Invoice details">
                        <header className="inv-drawer-head">
                            <div>
                                <p className="oh-eyebrow">INVOICE DETAILS</p>
                                <h3>{getInvoiceNumber(selectedInvoice)}</h3>
                                <StatusPill invoice={selectedInvoice} />
                            </div>
                            <button type="button" className="inv-x" onClick={() => setSelectedInvoice(null)} aria-label="Close details">✕</button>
                        </header>

                        <div className="inv-drawer-body">
                            <div className="inv-cust big">
                                <Avatar name={getCustomerName(selectedInvoice)} size={48} />
                                <div>
                                    <strong>{getCustomerName(selectedInvoice)}</strong>
                                    <small>{selectedInvoice.customerEmail || "No email recorded"}</small>
                                    {selectedInvoice.customerPhone && <small>{selectedInvoice.customerPhone}</small>}
                                </div>
                            </div>

                            <div className="inv-balance-card">
                                <div>
                                    <small>Balance due</small>
                                    <strong>{money(getBalance(selectedInvoice))}</strong>
                                </div>
                                <ProgressBar invoice={selectedInvoice} />
                                <div className="inv-bal-row">
                                    <span>Paid {money(getPaidAmount(selectedInvoice))}</span>
                                    <span>Total {money(getInvoiceTotal(selectedInvoice))}</span>
                                </div>
                            </div>

                            <dl className="inv-dates-grid">
                                <div><dt>Issued</dt><dd>{formatDate(selectedInvoice.issueDate, locale)}</dd></div>
                                <div>
                                    <dt>Due</dt>
                                    <dd>
                                        {formatDate(selectedInvoice.dueDate, locale)}
                                        {dueInfo(selectedInvoice).label && <small className={`inv-due ${dueInfo(selectedInvoice).tone}`}>{dueInfo(selectedInvoice).label}</small>}
                                    </dd>
                                </div>
                            </dl>

                            <h4>Items</h4>
                            <div className="inv-table-wrap">
                                <table className="inv-table compact">
                                    <thead>
                                        <tr><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th></tr>
                                    </thead>
                                    <tbody>
                                        {getLineItems(selectedInvoice).map((item, index) => (
                                            <tr key={`${item.description}-${index}`}>
                                                <td>{item.description}</td>
                                                <td className="num">{item.quantity}</td>
                                                <td className="num">{money(item.unitPrice)}</td>
                                                <td className="num">{money(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedInvoice.notes && (
                                <>
                                    <h4>Notes</h4>
                                    <p className="inv-muted">{selectedInvoice.notes}</p>
                                </>
                            )}

                            <h4>Recorded payment history</h4>
                            {getPayments(selectedInvoice).length ? (
                                <ol className="inv-timeline">
                                    {getPayments(selectedInvoice).map((payment, index) => (
                                        <li key={`${payment.reference}-${index}`}>
                                            <i />
                                            <div>
                                                <strong>{money(payment.amount)}</strong>
                                                <span>{payment.method} · {payment.reference}</span>
                                                <small>{formatDate(payment.date, locale)} · {payment.status}</small>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <div className="inv-empty small">
                                    <strong>No itemized payment history is available.</strong>
                                    <p>The invoice may contain a paid total without individual transaction records.</p>
                                </div>
                            )}
                        </div>

                        <footer className="inv-drawer-foot">
                            <div className="inv-actions wrap">
                                {canPay(selectedInvoice) && (
                                    <button type="button" className="oh-button oh-button-primary" onClick={() => openPaymentForm(selectedInvoice)}>Record payment</button>
                                )}
                                <button type="button" className="oh-button oh-button-secondary" onClick={() => printInvoice(selectedInvoice)}>Print / Save as PDF</button>
                                <button type="button" className="oh-button oh-button-secondary" onClick={() => openStatementFor(selectedInvoice)}>Customer statement</button>
                            </div>
                            <div className="inv-actions wrap">
                                <span className="inv-share-label">Share</span>
                                <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => shareInvoice(selectedInvoice, "native")}>Share summary</button>
                                <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => shareInvoice(selectedInvoice, "whatsapp")}>WhatsApp</button>
                                <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => shareInvoice(selectedInvoice, "telegram")}>Telegram</button>
                                <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => shareInvoice(selectedInvoice, "instagram")}>Instagram / Copy</button>
                            </div>
                            {canRemind(selectedInvoice) && (
                                <div className="inv-actions wrap">
                                    <span className="inv-share-label">Remind</span>
                                    <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => sendReminder(selectedInvoice, "whatsapp")}>WhatsApp reminder</button>
                                    <button type="button" className="oh-button oh-button-secondary inv-sm" onClick={() => sendReminder(selectedInvoice, "email")}>Email reminder</button>
                                </div>
                            )}
                        </footer>
                    </aside>
                </div>
            )}
        </div>
    );
}

/* ====================================================================
   Styles (scoped to .inv, reuses your --oh-* variables when present)
   ==================================================================== */

const invStyles = `
.inv{--g:#168653;--gd:#0f6a42;--red:#d03a3a;--amber:#b7791f;
  --card:var(--oh-card,#fff);--bd:var(--oh-border,#e5e7eb);--mut:var(--oh-muted,#6b7280);
  --inp:var(--oh-input-bg,#fff);--soft:rgba(22,134,83,.1);--ease:cubic-bezier(.2,.7,.2,1)}
.inv *{box-sizing:border-box}
.inv button{font:inherit}
.inv button:disabled{cursor:not-allowed;opacity:.5}
.inv :is(button,input,select,a):focus-visible{outline:3px solid rgba(22,134,83,.4);outline-offset:2px}
@keyframes invRise{from{opacity:0;transform:translateY(8px)}}
@keyframes invFade{from{opacity:0}}
@keyframes invSlide{from{transform:translateX(30px);opacity:0}}
@keyframes invPop{from{opacity:0;transform:translateY(8px) scale(.98)}}

/* KPIs */
.inv-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.inv-kpi{display:flex;gap:13px;align-items:flex-start;padding:16px;border:1px solid var(--bd);border-radius:16px;background:var(--card);animation:invRise .4s var(--ease) both;min-width:0}
.inv-kpi-icon{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:12px;background:var(--soft);color:var(--g);font-weight:800;font-size:17px}
.inv-kpi.warn .inv-kpi-icon{background:rgba(183,121,31,.14);color:var(--amber)}
.inv-kpi.bad .inv-kpi-icon{background:rgba(208,58,58,.12);color:var(--red)}
.inv-kpi small{display:block;color:var(--mut);font-size:13px;font-weight:600}
.inv-kpi strong{display:block;margin:3px 0 4px;font-size:21px;line-height:1.15;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.inv-kpi.bad strong{color:var(--red)}
.inv-kpi em{display:block;font-style:normal;color:var(--mut);font-size:12.5px}
.inv-kpi .inv-bar{margin:2px 0 5px}

/* tabs */
.inv-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;padding:5px;border:1px solid var(--bd);border-radius:14px;background:var(--card);width:fit-content;max-width:100%}
.inv-tab{display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border:0;border-radius:10px;background:transparent;color:var(--mut);font-weight:650;font-size:14.5px;cursor:pointer;transition:background .2s,color .2s}
.inv-tab:hover{color:inherit;background:rgba(127,127,127,.08)}
.inv-tab.on{background:var(--soft);color:var(--g)}
.inv-tab em{font-style:normal;min-width:22px;padding:1px 7px;border-radius:999px;background:rgba(127,127,127,.14);font-size:12px;font-weight:700;text-align:center}
.inv-tab.on em{background:var(--g);color:#fff}

/* banners */
.inv-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:11px 14px;border-radius:12px;font-weight:600;font-size:14px;animation:invRise .25s var(--ease) both}
.inv-banner.ok{background:rgba(22,134,83,.1);color:#12683f}
.inv-banner.bad{background:rgba(208,58,58,.1);color:#b23030}
.inv-banner button{border:0;background:none;color:inherit;cursor:pointer;opacity:.7;font-size:14px}
.inv-banner button:hover{opacity:1}
.inv-formwrap{margin-bottom:16px;animation:invRise .3s var(--ease) both}

/* card */
.inv-card{min-width:0;margin-bottom:16px;padding:20px;border:1px solid var(--bd);border-radius:18px;background:var(--card);animation:invRise .4s var(--ease) both}
.inv-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.inv-card-head h3{margin:0;font-size:18px;letter-spacing:-.01em}
.inv-card-head p{margin:3px 0 0;color:var(--mut);font-size:13.5px}
.inv-muted{color:var(--mut);font-size:13px}.inv-muted.pad{padding:18px 8px;text-align:center}
.inv-note{margin:14px 0 0;color:var(--mut);font-size:12.5px;line-height:1.55}

/* toolbar */
.inv-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.inv-search{display:flex;align-items:center;gap:9px;flex:1;min-width:220px;height:42px;padding:0 12px;border:1px solid var(--bd);border-radius:11px;background:var(--inp);color:var(--mut);transition:border-color .2s,box-shadow .2s}
.inv-search:focus-within{border-color:var(--g);box-shadow:0 0 0 4px rgba(22,134,83,.14)}
.inv-search input{flex:1;min-width:0;border:0;outline:0;background:none;color:inherit;font:inherit}
.inv-sort{display:flex;align-items:center;gap:8px;color:var(--mut);font-size:13px;font-weight:600}
.inv-sort select,.inv-field select,.inv-field input,.inv-dates input{height:42px;padding:0 11px;border:1px solid var(--bd);border-radius:11px;background:var(--inp);color:inherit;font:inherit}
.inv-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}
.inv-chips.tight{margin:8px 0 0}
.inv-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid var(--bd);border-radius:999px;background:transparent;color:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
.inv-chip:hover{border-color:var(--g)}
.inv-chip em{font-style:normal;font-size:12px;font-weight:700;padding:0 6px;border-radius:999px;background:rgba(127,127,127,.15)}
.inv-chip.on{background:var(--g);border-color:var(--g);color:#fff}
.inv-chip.on em{background:rgba(255,255,255,.25)}

/* table */
.inv-table-wrap{overflow-x:auto;border:1px solid var(--bd);border-radius:14px}
.inv-table{width:100%;border-collapse:collapse;font-size:14px}
.inv-table th{padding:11px 14px;text-align:left;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--mut);background:rgba(127,127,127,.06);border-bottom:1px solid var(--bd);white-space:nowrap}
.inv-table td{padding:13px 14px;border-bottom:1px solid var(--bd);vertical-align:middle}
.inv-table tbody tr:last-child td{border-bottom:0}
.inv-table tbody tr{transition:background .15s}
.inv-table tbody tr:hover{background:rgba(127,127,127,.05)}
.inv-table tr.late td:first-child{box-shadow:inset 3px 0 0 var(--red)}
.inv-table .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.inv-table .act{text-align:right}
.inv-table td small{display:block;margin-top:2px;color:var(--mut);font-size:12.5px}
.inv-table.compact td{padding:10px 14px}
.inv-table .open-row td{background:rgba(127,127,127,.05)}
.inv-link{padding:0;border:0;background:none;color:var(--g);font-weight:750;font-size:14.5px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:transparent}
.inv-link:hover{text-decoration-color:currentColor}
.inv-cust{display:flex;align-items:center;gap:10px;min-width:0}
.inv-cust strong{display:block}.inv-cust small{display:block;color:var(--mut);font-size:12.5px}
.inv-cust h3{margin:0;font-size:19px}.inv-cust p{margin:2px 0 0;color:var(--mut);font-size:13.5px}
.inv-cust.big{margin-bottom:14px}
.inv-avatar{display:inline-grid;place-items:center;flex-shrink:0;border-radius:50%;font-weight:750;letter-spacing:.02em;user-select:none}
.inv-pill{white-space:nowrap}
.inv-due{font-weight:650}
.inv-due.bad{color:var(--red)}.inv-due.warn{color:var(--amber)}.inv-due.ok{color:var(--g)}
.inv-bar{display:block;width:100%;min-width:70px;height:6px;margin:5px 0 2px;border-radius:999px;background:rgba(127,127,127,.18);overflow:hidden}
.inv-bar.big{height:8px}
.inv-bar i{display:block;height:100%;border-radius:inherit;background:var(--g);transition:width .5s var(--ease)}
.inv-type{display:inline-block;margin-right:8px;padding:1px 8px;border-radius:999px;font-size:11.5px;font-weight:700}
.inv-type.inv{background:rgba(44,90,158,.12);color:#2c5a9e}.inv-type.pay{background:rgba(22,134,83,.12);color:#12683f}
.okc{color:var(--g)}

/* actions + menu */
.inv-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:nowrap}
.inv-actions.wrap{flex-wrap:wrap;justify-content:flex-start}
.inv .inv-sm{padding:6px 11px;font-size:13px;min-height:0;white-space:nowrap}
.inv .inv-dots{padding:6px 10px;font-weight:800;letter-spacing:.1em}
.inv-menu-wrap{position:relative}
.inv-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:200px;padding:6px;border:1px solid var(--bd);border-radius:13px;background:var(--card);box-shadow:0 18px 40px rgba(0,0,0,.2);text-align:left;animation:invPop .18s var(--ease) both}
.inv-menu.up{top:auto;bottom:calc(100% + 6px)}
.inv-menu button{display:block;width:100%;padding:9px 12px;border:0;border-radius:9px;background:none;color:inherit;text-align:left;font-weight:600;font-size:14px;cursor:pointer}
.inv-menu button:hover{background:var(--soft)}
.inv-share-label{min-width:54px;color:var(--mut);font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}

/* pager */
.inv-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px;color:var(--mut);font-size:13.5px}
.inv-pager>div{display:flex;align-items:center;gap:10px}.inv-pager b{color:inherit;font-variant-numeric:tabular-nums}

/* empty */
.inv-empty{display:grid;justify-items:center;gap:6px;padding:44px 16px;text-align:center}
.inv-empty.small{padding:18px 8px;border:1px dashed var(--bd);border-radius:12px}
.inv-empty-icon{display:grid;place-items:center;width:56px;height:56px;margin-bottom:6px;border-radius:50%;background:var(--soft);color:var(--g);font-size:22px}
.inv-empty strong{font-size:16px}.inv-empty p{margin:0 0 8px;color:var(--mut);font-size:14px;max-width:360px}

/* statements */
.inv-split{display:grid;grid-template-columns:minmax(250px,.7fr) minmax(0,2fr);gap:18px;align-items:start}
.inv-customers{display:grid;gap:10px;min-width:0}
.inv-customer-list{display:grid;gap:4px;max-height:560px;overflow:auto;padding-right:2px}
.inv-customer{display:flex;align-items:center;gap:10px;width:100%;padding:10px;border:1px solid transparent;border-radius:12px;background:none;color:inherit;text-align:left;cursor:pointer;transition:background .15s,border-color .15s}
.inv-customer:hover{background:rgba(127,127,127,.07)}
.inv-customer.on{background:var(--soft);border-color:rgba(22,134,83,.35)}
.inv-customer>span{flex:1;min-width:0}
.inv-customer strong,.inv-customer small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inv-customer small{color:var(--mut);font-size:12.5px}
.inv-customer b{font-size:12.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
.inv-customer b.due{color:var(--red)}.inv-customer b.clear{color:var(--g)}
.inv-statement{min-width:0}
.inv-stmt-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.inv-period{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;padding:12px;border:1px solid var(--bd);border-radius:14px}
.inv-dates{display:flex;gap:10px;flex-wrap:wrap}
.inv-dates label{display:grid;gap:5px;font-size:12.5px;font-weight:650;color:var(--mut)}
.inv-period .inv-chips{margin:0}
.inv-mini-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
.inv-mini-kpis>div{padding:12px 14px;border:1px solid var(--bd);border-radius:13px}
.inv-mini-kpis small{display:block;color:var(--mut);font-size:12.5px;font-weight:600}
.inv-mini-kpis strong{display:block;margin-top:3px;font-size:17px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.inv-mini-kpis .hi{background:var(--soft);border-color:rgba(22,134,83,.3)}

/* reports */
.inv-reports{display:grid;gap:0}
.inv-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.inv-two .inv-card{margin-bottom:16px}
.inv-aging{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.inv-age{display:grid;justify-items:center;gap:3px;text-align:center}
.inv-age-bar{display:flex;align-items:flex-end;width:100%;height:120px;border-radius:12px;background:rgba(127,127,127,.1);overflow:hidden}
.inv-age-bar i{display:block;width:100%;border-radius:12px 12px 0 0;background:var(--g);transition:height .6s var(--ease)}
.inv-age.d30 .inv-age-bar i{background:#c9a227}.inv-age.d60 .inv-age-bar i{background:#e08a1e}.inv-age.d90 .inv-age-bar i{background:#d9534f}.inv-age.d90p .inv-age-bar i{background:#a02727}
.inv-age strong{margin-top:6px;font-size:14.5px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.inv-age small{font-weight:650}.inv-age em{font-style:normal;color:var(--mut);font-size:12px}
.inv-ring-row{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.inv-ring{--p:0;position:relative;display:grid;place-items:center;width:130px;height:130px;border-radius:50%;background:conic-gradient(var(--g) calc(var(--p)*1%),rgba(127,127,127,.18) 0)}
.inv-ring::before{content:"";position:absolute;inset:14px;border-radius:50%;background:var(--card)}
.inv-ring b{position:relative;font-size:26px;font-variant-numeric:tabular-nums}
.inv-legend{flex:1;min-width:160px;margin:0;padding:0;list-style:none;display:grid;gap:8px}
.inv-legend li{display:flex;align-items:center;justify-content:space-between;gap:10px}
.inv-debtors{margin:0;padding:0;list-style:none;display:grid;gap:12px}
.inv-debtors li{display:flex;align-items:center;gap:11px}
.inv-debtors li>div{flex:1;min-width:0}.inv-debtors strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inv-debtors b{font-variant-numeric:tabular-nums;white-space:nowrap}
.inv-debtors .inv-bar i{background:var(--red)}

/* modal + drawer */
.inv-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(10,24,16,.55);backdrop-filter:blur(3px);animation:invFade .2s ease both}
.inv-backdrop.side{place-items:stretch end;padding:0}
.inv-modal{width:min(100%,500px);max-height:calc(100vh - 36px);overflow:auto;padding:22px;border-radius:20px;background:var(--card);color:inherit;box-shadow:0 30px 80px rgba(0,0,0,.35);animation:invPop .25s var(--ease) both}
.inv-modal-head,.inv-drawer-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:14px}
.inv-modal-head h3,.inv-drawer-head h3{margin:0;font-size:20px;letter-spacing:-.01em}
.inv-modal-head p{margin:4px 0 0;color:var(--mut);font-size:14px}
.inv-x{display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:10px;background:none;color:var(--mut);cursor:pointer;flex-shrink:0}
.inv-x:hover{background:rgba(127,127,127,.12);color:inherit}
.inv-pay-sum{display:grid;gap:4px;margin-bottom:16px;padding:14px;border:1px solid var(--bd);border-radius:14px;background:var(--soft)}
.inv-pay-sum>div{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.inv-pay-sum span{color:var(--mut);font-size:13px;font-weight:600}.inv-pay-sum strong{font-size:22px;font-variant-numeric:tabular-nums}
.inv-pay-sum small{color:var(--mut);font-size:12.5px}
.inv-form{display:grid;gap:15px}
.inv-field{display:grid;gap:6px}
.inv-field label{font-size:13.5px;font-weight:650}
.inv-after{font-weight:650;color:var(--g)}.inv-after.bad{color:var(--red)}
.inv-modal-actions{display:flex;justify-content:flex-end;gap:10px}

.inv-drawer{display:flex;flex-direction:column;width:min(100%,560px);height:100%;background:var(--card);color:inherit;box-shadow:-20px 0 60px rgba(0,0,0,.3);animation:invSlide .3s var(--ease) both}
.inv-drawer-head{align-items:flex-start;margin:0;padding:20px 22px 14px;border-bottom:1px solid var(--bd)}
.inv-drawer-head .inv-pill{margin-top:6px;display:inline-block}
.inv-drawer-body{flex:1;overflow:auto;padding:18px 22px}
.inv-drawer-body h4{margin:20px 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.inv-drawer-foot{display:grid;gap:10px;padding:14px 22px 18px;border-top:1px solid var(--bd)}
.inv-balance-card{padding:16px;border:1px solid var(--bd);border-radius:14px;background:var(--soft)}
.inv-balance-card small{display:block;color:var(--mut);font-size:13px;font-weight:600}
.inv-balance-card strong{display:block;font-size:28px;font-variant-numeric:tabular-nums}
.inv-bal-row{display:flex;justify-content:space-between;gap:10px;color:var(--mut);font-size:12.5px;font-variant-numeric:tabular-nums}
.inv-dates-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0 0}
.inv-dates-grid>div{padding:11px 13px;border:1px solid var(--bd);border-radius:12px}
.inv-dates-grid dt{color:var(--mut);font-size:12.5px;font-weight:600}.inv-dates-grid dd{margin:3px 0 0;font-weight:700}
.inv-dates-grid small{display:block;font-size:12.5px;margin-top:2px}
.inv-timeline{margin:0;padding:0;list-style:none;display:grid;gap:0}
.inv-timeline li{position:relative;display:flex;gap:12px;padding:0 0 16px 2px}
.inv-timeline li:not(:last-child)::before{content:"";position:absolute;left:7px;top:16px;bottom:0;width:2px;background:var(--bd)}
.inv-timeline i{flex-shrink:0;width:16px;height:16px;margin-top:3px;border-radius:50%;background:var(--g);box-shadow:0 0 0 4px var(--soft)}
.inv-timeline strong{display:block;font-variant-numeric:tabular-nums}
.inv-timeline span,.inv-timeline small{display:block;color:var(--mut);font-size:13px}

@media(max-width:1100px){.inv-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.inv-split{grid-template-columns:minmax(0,1fr)}.inv-customer-list{max-height:260px}.inv-mini-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.inv-two{grid-template-columns:minmax(0,1fr)}}
@media(max-width:720px){
  .inv-kpis{grid-template-columns:minmax(0,1fr)}.inv-aging{grid-template-columns:repeat(2,minmax(0,1fr))}
  .inv-tabs{width:100%;overflow-x:auto;flex-wrap:nowrap}.inv-tab{flex-shrink:0}
  .inv-table.stack thead{display:none}
  .inv-actions{flex-wrap:wrap}
  .inv-drawer{width:100%}
}
@media(prefers-reduced-motion:reduce){.inv *,.inv *::before,.inv *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;