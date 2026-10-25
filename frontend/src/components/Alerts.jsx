
import React from "react";
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    Info,
    ShieldAlert,
} from "lucide-react";

const alertConfig = {
    critical: {
        Icon: ShieldAlert,
        label: "Critical",
    },
    warning: {
        Icon: AlertTriangle,
        label: "Warning",
    },
    info: {
        Icon: Info,
        label: "Information",
    },
    success: {
        Icon: CheckCircle2,
        label: "Success",
    },
};

export default function Alerts({ items = [], onAction }) {
    const alerts = Array.isArray(items) ? items : [];

    if (alerts.length === 0) {
        return (
            <div className="alerts-empty" role="status">
                <span className="alerts-empty-icon" aria-hidden="true">
                    <CheckCircle2 size={20} strokeWidth={1.8} />
                </span>

                <div>
                    <strong>You're all caught up</strong>
                    <span>No alerts need your attention right now.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="alerts-list" aria-label="Business alerts">
            {alerts.map((item, index) => {
                const type = alertConfig[item?.type] ? item.type : "info";
                const { Icon, label } = alertConfig[type];
                const title = item?.title || "Business update";
                const detail = item?.detail;
                const action = item?.action;
                const key = item?.id ?? `${type}-${title}-${index}`;

                return (
                    <article
                        className={`alert-row alert-${type}`}
                        key={key}
                    >
                        <span className="alert-symbol" aria-hidden="true">
                            <Icon size={18} strokeWidth={1.8} />
                        </span>

                        <div className="alert-copy">
                            <div className="alert-heading">
                                <strong>{title}</strong>
                                <span className="alert-severity">{label}</span>
                            </div>

                            {detail && <span className="alert-detail">{detail}</span>}
                        </div>

                        {action && (
                            <button
                                type="button"
                                className="text-action"
                                onClick={() => onAction?.(item)}
                                aria-label={`${action}: ${title}`}
                            >
                                <span>{action}</span>
                                <ArrowUpRight size={15} aria-hidden="true" />
                            </button>
                        )}
                    </article>
                );
            })}
        </div>
    );
}
