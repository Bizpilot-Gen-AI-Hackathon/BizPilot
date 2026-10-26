import { useCallback, useMemo, useState } from "react";
import {
    formatCurrency,
    formatDateTime,
    formatStatus,
    getStatusClass,
} from "../utils/formatters";

const initialState = {
    calls: [],
    suppliers: [],
    invoices: [],
    messages: [],
    activities: [],
};

function createId(prefix) {
    if (
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
    ) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}

function createTimestamp() {
    return new Date().toISOString();
}

function normalizeSearch(value) {
    return String(value ?? "").trim().toLowerCase();
}

function matchesSearch(record, query, fields) {
    if (!query) {
        return true;
    }

    const normalizedQuery = normalizeSearch(query);

    return fields.some((field) =>
        normalizeSearch(record[field]).includes(normalizedQuery)
    );
}

function calculateInvoiceTotals(items = []) {
    const subtotal = items.reduce((total, item) => {
        const quantity = Math.max(0, Number(item.quantity) || 0);
        const unitPrice = Math.max(0, Number(item.unitPrice) || 0);

        return total + quantity * unitPrice;
    }, 0);

    return {
        subtotal,
        total: subtotal,
    };
}

function addActivity(state, activity) {
    const entry = {
        id: createId("activity"),
        timestamp: createTimestamp(),
        ...activity,
    };

    return {
        ...state,
        activities: [entry, ...state.activities],
    };
}

export default function useOperationsHub(options = {}) {
    const {
        initialData = {},
        currency = "KES",
        locale = "en-KE",
    } = options;

    const [state, setState] = useState(() => ({
        calls: initialData.calls ?? initialState.calls,
        suppliers: initialData.suppliers ?? initialState.suppliers,
        invoices: initialData.invoices ?? initialState.invoices,
        messages: initialData.messages ?? initialState.messages,
        activities: initialData.activities ?? initialState.activities,
    }));

    const [search, setSearch] = useState({
        calls: "",
        suppliers: "",
        invoices: "",
        messages: "",
    });

    const [filters, setFilters] = useState({
        calls: "all",
        suppliers: "all",
        invoices: "all",
        messages: "all",
    });

    const [loading] = useState({
        calls: false,
        suppliers: false,
        invoices: false,
        messages: false,
    });

    const [error, setError] = useState(null);

    const recordActivity = useCallback((title, description, status = "Recorded") => {
        setState((current) =>
            addActivity(current, {
                title,
                description,
                status,
            })
        );
    }, []);

    const updateSearch = useCallback((section, value) => {
        setSearch((current) => ({
            ...current,
            [section]: value,
        }));
    }, []);

    const updateFilter = useCallback((section, value) => {
        setFilters((current) => ({
            ...current,
            [section]: value,
        }));
    }, []);

    const addSupplier = useCallback(
        (supplierData) => {
            if (!supplierData?.name?.trim()) {
                setError("Supplier name is required.");
                return null;
            }

            const supplier = {
                id: createId("supplier"),
                name: supplierData.name.trim(),
                company: supplierData.company?.trim() ?? "",
                phone: supplierData.phone?.trim() ?? "",
                email: supplierData.email?.trim() ?? "",
                category: supplierData.category?.trim() ?? "",
                productsSupplied: Number(supplierData.productsSupplied) || 0,
                outstandingBalance:
                    Number(supplierData.outstandingBalance) || 0,
                status: supplierData.status ?? "Active",
                createdAt: createTimestamp(),
                ...supplierData,
            };

            setState((current) =>
                addActivity(
                    {
                        ...current,
                        suppliers: [supplier, ...current.suppliers],
                    },
                    {
                        title: "Supplier added",
                        description: supplier.name,
                        status: "Recorded",
                    }
                )
            );

            setError(null);
            return supplier;
        },
        []
    );

    const updateSupplier = useCallback((supplierId, updates) => {
        let updatedSupplier = null;

        setState((current) => {
            const suppliers = current.suppliers.map((supplier) => {
                if (supplier.id !== supplierId) {
                    return supplier;
                }

                updatedSupplier = {
                    ...supplier,
                    ...updates,
                    updatedAt: createTimestamp(),
                };

                return updatedSupplier;
            });

            if (!updatedSupplier) {
                return current;
            }

            return addActivity(
                {
                    ...current,
                    suppliers,
                },
                {
                    title: "Supplier updated",
                    description: updatedSupplier.name,
                    status: "Updated",
                }
            );
        });

        return updatedSupplier;
    }, []);

    const removeSupplier = useCallback((supplierId) => {
        let removedSupplier = null;

        setState((current) => {
            removedSupplier =
                current.suppliers.find(
                    (supplier) => supplier.id === supplierId
                ) ?? null;

            if (!removedSupplier) {
                return current;
            }

            return addActivity(
                {
                    ...current,
                    suppliers: current.suppliers.filter(
                        (supplier) => supplier.id !== supplierId
                    ),
                },
                {
                    title: "Supplier removed",
                    description: removedSupplier.name,
                    status: "Recorded",
                }
            );
        });

        return Boolean(removedSupplier);
    }, []);

    const addCall = useCallback((callData) => {
        if (!callData?.contactName?.trim()) {
            setError("Contact name is required to create a call record.");
            return null;
        }

        const call = {
            id: createId("call"),
            contactName: callData.contactName.trim(),
            phone: callData.phone?.trim() ?? "",
            reason: callData.reason?.trim() ?? "",
            priority: callData.priority ?? "Normal",
            assignedTo: callData.assignedTo ?? "",
            status: callData.status ?? "Pending",
            createdAt: createTimestamp(),
            ...callData,
        };

        setState((current) =>
            addActivity(
                {
                    ...current,
                    calls: [call, ...current.calls],
                },
                {
                    title: "Call record created",
                    description: call.contactName,
                    status: "Recorded",
                }
            )
        );

        setError(null);
        return call;
    }, []);

    const assignCall = useCallback((callId, assignedTo) => {
        if (!String(assignedTo ?? "").trim()) {
            setError("Choose a team member before assigning the call.");
            return false;
        }

        let found = false;

        setState((current) => {
            const calls = current.calls.map((call) => {
                if (call.id !== callId) {
                    return call;
                }

                found = true;

                return {
                    ...call,
                    assignedTo: String(assignedTo).trim(),
                    status:
                        call.status === "Pending"
                            ? "Assigned"
                            : call.status,
                    updatedAt: createTimestamp(),
                };
            });

            if (!found) {
                return current;
            }

            return addActivity(
                {
                    ...current,
                    calls,
                },
                {
                    title: "Call assigned",
                    description: `Assigned to ${String(assignedTo).trim()}`,
                    status: "Updated",
                }
            );
        });

        setError(null);
        return found;
    }, []);

    const updateCallStatus = useCallback((callId, status) => {
        if (!String(status ?? "").trim()) {
            setError("A call status is required.");
            return false;
        }

        let found = false;

        setState((current) => {
            const calls = current.calls.map((call) => {
                if (call.id !== callId) {
                    return call;
                }

                found = true;

                return {
                    ...call,
                    status,
                    updatedAt: createTimestamp(),
                };
            });

            if (!found) {
                return current;
            }

            return addActivity(
                {
                    ...current,
                    calls,
                },
                {
                    title: "Call status updated",
                    description: `Status: ${formatStatus(status)}`,
                    status: "Updated",
                }
            );
        });

        setError(null);
        return found;
    }, []);

    const createInvoice = useCallback((invoiceData) => {
        if (!invoiceData?.customerName?.trim()) {
            setError("Customer name is required.");
            return null;
        }

        const items = Array.isArray(invoiceData.items)
            ? invoiceData.items.map((item) => ({
                description: item.description?.trim() ?? "",
                quantity: Math.max(0, Number(item.quantity) || 0),
                unitPrice: Math.max(0, Number(item.unitPrice) || 0),
            }))
            : [];

        const totals = calculateInvoiceTotals(items);

        if (items.length === 0 || totals.total <= 0) {
            setError("Add at least one invoice item with a valid amount.");
            return null;
        }

        const invoice = {
            id: createId("invoice"),
            invoiceNumber:
                invoiceData.invoiceNumber ??
                `INV-${Date.now().toString().slice(-8)}`,
            customerName: invoiceData.customerName.trim(),
            customerEmail: invoiceData.customerEmail?.trim() ?? "",
            customerPhone: invoiceData.customerPhone?.trim() ?? "",
            items,
            subtotal: totals.subtotal,
            total: totals.total,
            amountPaid: 0,
            balance: totals.total,
            currency: invoiceData.currency ?? currency,
            status: invoiceData.status ?? "Unpaid",
            issueDate: invoiceData.issueDate ?? createTimestamp(),
            dueDate: invoiceData.dueDate ?? "",
            notes: invoiceData.notes?.trim() ?? "",
            createdAt: createTimestamp(),
        };

        setState((current) =>
            addActivity(
                {
                    ...current,
                    invoices: [invoice, ...current.invoices],
                },
                {
                    title: "Invoice created",
                    description: `${invoice.invoiceNumber} for ${invoice.customerName}`,
                    status: "Recorded",
                }
            )
        );

        setError(null);
        return invoice;
    }, [currency]);

    const recordInvoicePayment = useCallback(
        (invoiceId, paymentAmount, paymentDetails = {}) => {
            const amount = Number(paymentAmount);

            if (!Number.isFinite(amount) || amount <= 0) {
                setError("Enter a valid payment amount greater than zero.");
                return false;
            }

            let updatedInvoice = null;

            setState((current) => {
                const invoices = current.invoices.map((invoice) => {
                    if (invoice.id !== invoiceId) {
                        return invoice;
                    }

                    const balance = Math.max(
                        0,
                        Number(invoice.balance ?? invoice.total) || 0
                    );

                    if (amount > balance) {
                        return invoice;
                    }

                    const amountPaid =
                        (Number(invoice.amountPaid) || 0) + amount;

                    const remainingBalance = Math.max(
                        0,
                        Number(invoice.total) - amountPaid
                    );

                    updatedInvoice = {
                        ...invoice,
                        amountPaid,
                        balance: remainingBalance,
                        status:
                            remainingBalance === 0
                                ? "Paid"
                                : "Partially Paid",
                        payments: [
                            ...(invoice.payments ?? []),
                            {
                                id: createId("payment"),
                                amount,
                                method: paymentDetails.method ?? "Manual",
                                reference: paymentDetails.reference ?? "",
                                recordedAt: createTimestamp(),
                            },
                        ],
                        updatedAt: createTimestamp(),
                    };

                    return updatedInvoice;
                });

                if (!updatedInvoice) {
                    return current;
                }

                return addActivity(
                    {
                        ...current,
                        invoices,
                    },
                    {
                        title: "Payment recorded",
                        description: `${updatedInvoice.invoiceNumber}: ${amount.toFixed(2)}`,
                        status: "Recorded",
                    }
                );
            });

            if (!updatedInvoice) {
                setError(
                    "Payment was not recorded. Check the invoice and outstanding balance."
                );
                return false;
            }

            setError(null);
            return true;
        },
        []
    );

    const updateInvoiceStatus = useCallback((invoiceId, status) => {
        let found = false;

        setState((current) => {
            const invoices = current.invoices.map((invoice) => {
                if (invoice.id !== invoiceId) {
                    return invoice;
                }

                found = true;

                return {
                    ...invoice,
                    status,
                    updatedAt: createTimestamp(),
                };
            });

            if (!found) {
                return current;
            }

            return addActivity(
                {
                    ...current,
                    invoices,
                },
                {
                    title: "Invoice status updated",
                    description: `Status: ${formatStatus(status)}`,
                    status: "Updated",
                }
            );
        });

        return found;
    }, []);

    const prepareMessage = useCallback((messageData) => {
        if (!messageData?.recipient?.trim()) {
            setError("A message recipient is required.");
            return null;
        }

        if (!messageData?.message?.trim()) {
            setError("Message content is required.");
            return null;
        }

        const message = {
            id: createId("message"),
            recipient: messageData.recipient.trim(),
            channel: messageData.channel ?? "sms",
            subject: messageData.subject?.trim() ?? "",
            message: messageData.message.trim(),
            status: "Draft",
            createdAt: createTimestamp(),
        };

        setState((current) =>
            addActivity(
                {
                    ...current,
                    messages: [message, ...current.messages],
                },
                {
                    title: "Message prepared",
                    description: `${message.channel.toUpperCase()} prepared for ${message.recipient}`,
                    status: "Draft",
                }
            )
        );

        setError(null);
        return message;
    }, []);

    const markMessageSent = useCallback((messageId, providerResponse = {}) => {
        let found = false;

        setState((current) => {
            const messages = current.messages.map((message) => {
                if (message.id !== messageId) {
                    return message;
                }

                found = true;

                return {
                    ...message,
                    status: "Sent",
                    providerReference: providerResponse.reference ?? "",
                    sentAt: createTimestamp(),
                };
            });

            if (!found) {
                return current;
            }

            return addActivity(
                {
                    ...current,
                    messages,
                },
                {
                    title: "Message marked as sent",
                    description: `Recipient: ${messages.find((message) => message.id === messageId)
                        ?.recipient ?? ""
                        }`,
                    status: "Updated",
                }
            );
        });

        return found;
    }, []);

    const markMessageFailed = useCallback((messageId, reason = "") => {
        let found = false;

        setState((current) => {
            const messages = current.messages.map((message) => {
                if (message.id !== messageId) {
                    return message;
                }

                found = true;

                return {
                    ...message,
                    status: "Failed",
                    failureReason: reason,
                    failedAt: createTimestamp(),
                };
            });

            if (!found) {
                return current;
            }

            return addActivity(
                {
                    ...current,
                    messages,
                },
                {
                    title: "Message delivery failed",
                    description: reason || "No failure reason provided",
                    status: "Failed",
                }
            );
        });

        return found;
    }, []);

    const deleteMessage = useCallback((messageId) => {
        let found = false;

        setState((current) => {
            const message = current.messages.find(
                (item) => item.id === messageId
            );

            if (!message) {
                return current;
            }

            found = true;

            return addActivity(
                {
                    ...current,
                    messages: current.messages.filter(
                        (item) => item.id !== messageId
                    ),
                },
                {
                    title: "Message removed",
                    description: message.recipient,
                    status: "Recorded",
                }
            );
        });

        return found;
    }, []);


    const filteredCalls = useMemo(() => {
        return state.calls.filter((call) => {
            const queryMatches = matchesSearch(call, search.calls, [
                "contactName",
                "phone",
                "reason",
                "assignedTo",
                "status",
                "priority",
            ]);

            const statusMatches =
                filters.calls === "all" ||
                normalizeSearch(call.status) === normalizeSearch(filters.calls);

            return queryMatches && statusMatches;
        });
    }, [state.calls, search.calls, filters.calls]);


    const filteredSuppliers = useMemo(() => {
        return state.suppliers.filter((supplier) => {
            const queryMatches = matchesSearch(supplier, search.suppliers, [
                "name",
                "company",
                "phone",
                "email",
                "category",
                "status",
            ]);
            const statusMatches =
                filters.suppliers === "all" ||
                normalizeSearch(supplier.status) ===
                normalizeSearch(filters.suppliers);

            return queryMatches && statusMatches;
        });
    }, [state.suppliers, search.suppliers, filters.suppliers]);

    const filteredInvoices = useMemo(() => {
        return state.invoices.filter((invoice) => {
            const queryMatches = matchesSearch(invoice, search.invoices, [
                "invoiceNumber",
                "customerName",
                "customerEmail",
                "customerPhone",
                "status",
            ]);
            const statusMatches =
                filters.invoices === "all" ||
                normalizeSearch(invoice.status) ===
                normalizeSearch(filters.invoices);

            return queryMatches && statusMatches;
        });
    }, [state.invoices, search.invoices, filters.invoices]);

    const filteredMessages = useMemo(() => {
        return state.messages.filter((message) => {
            const queryMatches = matchesSearch(message, search.messages, [
                "recipient",
                "channel",
                "subject",
                "message",
                "status",
            ]);
            const statusMatches =
                filters.messages === "all" ||
                normalizeSearch(message.status) ===
                normalizeSearch(filters.messages);

            return queryMatches && statusMatches;
        });
    }, [state.messages, search.messages, filters.messages]);

    const stats = useMemo(() => {
        const outstandingInvoices = state.invoices.filter(
            (invoice) => Number(invoice.balance) > 0
        );

        const outstandingAmount = outstandingInvoices.reduce(
            (total, invoice) => total + (Number(invoice.balance) || 0),
            0
        );

        const paidAmount = state.invoices.reduce(
            (total, invoice) => total + (Number(invoice.amountPaid) || 0),
            0
        );

        const pendingCalls = state.calls.filter(
            (call) =>
                !["completed", "closed", "resolved"].includes(
                    normalizeSearch(call.status)
                )
        );

        const activeSuppliers = state.suppliers.filter(
            (supplier) =>
                !["inactive", "archived"].includes(
                    normalizeSearch(supplier.status)
                )
        );

        const failedMessages = state.messages.filter(
            (message) => normalizeSearch(message.status) === "failed"
        );

        return {
            totalCalls: state.calls.length,
            pendingCalls: pendingCalls.length,
            totalSuppliers: state.suppliers.length,
            activeSuppliers: activeSuppliers.length,
            totalInvoices: state.invoices.length,
            outstandingInvoices: outstandingInvoices.length,
            outstandingAmount,
            outstandingAmountFormatted: formatCurrency(
                outstandingAmount,
                currency,
                locale
            ),
            paidAmount,
            paidAmountFormatted: formatCurrency(
                paidAmount,
                currency,
                locale
            ),
            totalMessages: state.messages.length,
            failedMessages: failedMessages.length,
            recentActivities: state.activities.length,
        };
    }, [state, currency, locale]);

    const recentActivities = useMemo(
        () =>
            [...state.activities]
                .sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
                .slice(0, 10)
                .map((activity) => ({
                    ...activity,
                    formattedTime: formatDateTime(
                        activity.timestamp,
                        locale
                    ),
                    statusLabel: formatStatus(activity.status),
                    statusClass: getStatusClass(activity.status),
                })),
        [state.activities, locale]
    );

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    const replaceData = useCallback((data = {}) => {
        setState({
            calls: data.calls ?? [],
            suppliers: data.suppliers ?? [],
            invoices: data.invoices ?? [],
            messages: data.messages ?? [],
            activities: data.activities ?? [],
        });

        setError(null);
    }, []);

    return {
        state,

        calls: filteredCalls,
        allCalls: state.calls,

        suppliers: filteredSuppliers,
        allSuppliers: state.suppliers,

        invoices: filteredInvoices,
        allInvoices: state.invoices,

        messages: filteredMessages,
        allMessages: state.messages,

        activities: recentActivities,

        search,
        filters,
        loading,
        error,
        stats,

        setSearch: updateSearch,
        setFilter: updateFilter,
        resetError,
        replaceData,
        recordActivity,

        addSupplier,
        updateSupplier,
        removeSupplier,

        addCall,
        assignCall,
        updateCallStatus,

        createInvoice,
        recordInvoicePayment,
        updateInvoiceStatus,

        prepareMessage,
        markMessageSent,
        markMessageFailed,
        deleteMessage,
    };
}