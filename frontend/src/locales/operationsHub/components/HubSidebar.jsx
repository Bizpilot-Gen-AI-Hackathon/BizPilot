export default function HubSidebar({
    items = [],
    activeSection,
    onNavigate,
}) {
    return (
        <aside className="oh-sidebar">
            <div className="oh-brand">
                <div className="oh-brand-mark">B</div>

                <div className="oh-brand-copy">
                    <strong>BizPilot</strong>
                    <span>Operations Hub</span>
                </div>
            </div>

            <div className="oh-sidebar-section">
                <p className="oh-sidebar-label">WORKSPACE</p>

                <nav
                    className="oh-navigation"
                    aria-label="Operations Hub navigation"
                >
                    {items.map((item) => {
                        const isActive = activeSection === item.id;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`oh-nav-item ${isActive ? "is-active" : ""
                                    }`}
                                onClick={() => onNavigate(item.id)}
                                aria-current={
                                    isActive ? "page" : undefined
                                }
                            >
                                <span className="oh-nav-content">
                                    <span className="oh-nav-title">
                                        {item.label}
                                    </span>

                                    <span className="oh-nav-description">
                                        {item.description}
                                    </span>
                                </span>

                                {isActive && (
                                    <span
                                        className="oh-nav-indicator"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="oh-sidebar-bottom">
                <div className="oh-sidebar-divider" />

                <div className="oh-workspace-info">
                    <span className="oh-workspace-status" />

                    <div>
                        <strong>Operations workspace</strong>
                        <span>BizPilot</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}