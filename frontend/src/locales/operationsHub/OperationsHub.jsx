
import { useState } from "react";
import OperationsOverview from "./pages/OperationsOverview";
import CallCentre from "./pages/CallCentre";
import Suppliers from "./pages/Suppliers";
import Invoices from "./pages/Invoices";
import Messages from "./pages/Messages";
import HubSidebar from "./components/HubSidebar";
import useOperationsHub from "./hooks/useOperationsHub";
import "./operationsHub.css";

const navigationItems = [
    {
        id: "overview",
        label: "Overview",
        description: "Your daily operations at a glance",
    },
    {
        id: "calls",
        label: "Call Centre",
        description: "Manage customer and supplier conversations",
    },
    {
        id: "suppliers",
        label: "Suppliers & Stock",
        description: "Monitor stock and coordinate reordering",
    },
    {
        id: "invoices",
        label: "Invoices & Payments",
        description: "Create invoices and track outstanding balances",
    },
    {
        id: "messages",
        label: "Messages",
        description: "Prepare customer and supplier communications",
    },
];

export default function OperationsHub() {
    const [activeSection, setActiveSection] = useState("overview");

    const operations = useOperationsHub();

    const activeItem =
        navigationItems.find((item) => item.id === activeSection) ??
        navigationItems[0];

    function renderActiveSection() {
        switch (activeSection) {
            case "calls":
                return (
                    <CallCentre
                        calls={operations.calls}
                        onAddCall={operations.addCall}
                        onAssignCall={operations.assignCall}
                        onUpdateCallStatus={operations.updateCallStatus}
                    />
                );

            case "suppliers":
                return (
                    <Suppliers
                        suppliers={operations.suppliers}
                        onAddSupplier={operations.addSupplier}
                        onEditSupplier={operations.updateSupplier}
                    />
                );

            case "invoices":
                return (
                    <Invoices
                        invoices={operations.invoices}
                        onCreateInvoice={operations.createInvoice}
                        onRecordPayment={operations.recordInvoicePayment}
                    />
                );

            case "messages":
                return (
                    <Messages
                        messages={operations.messages}
                        recipients={operations.allSuppliers.map((supplier) => ({
                            id: supplier.id,
                            name: supplier.name,
                            phone: supplier.phone,
                            email: supplier.email,
                        }))}
                        onPrepareMessage={operations.prepareMessage}
                        onMarkMessageSent={operations.markMessageSent}
                    />
                );

            case "overview":
            default:
                return (
                    <OperationsOverview
                        stats={operations.stats}
                        activities={operations.activities}
                        onNavigate={setActiveSection}
                    />
                );
        }
    }

    return (
        <div className="oh-shell">
            <HubSidebar
                items={navigationItems}
                activeSection={activeSection}
                onNavigate={setActiveSection}
            />

            <main className="oh-main">
                <header className="oh-topbar">
                    <div className="oh-heading">
                        <p className="oh-eyebrow">
                            BIZPILOT / OPERATIONS HUB
                        </p>

                        <h1>{activeItem.label}</h1>

                        <p className="oh-subtitle">
                            {activeItem.description}
                        </p>
                    </div>

                    <div className="oh-workspace">
                        <span
                            className="oh-workspace-indicator"
                            aria-hidden="true"
                        />
                        <span>Workspace</span>
                    </div>
                </header>

                <section
                    className="oh-page-content"
                    key={activeSection}
                >
                    {renderActiveSection()}
                </section>

                <footer className="oh-footer">
                    <span>BizPilot Operations Hub</span>
                    <span>Operations workspace</span>
                </footer>
            </main>
        </div>
    );
}
