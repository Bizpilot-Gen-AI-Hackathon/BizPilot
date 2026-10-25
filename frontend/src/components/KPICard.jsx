
import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function KPICard({
    label,
    value,
    change,
    detail,
    icon: Icon,
    tone = "green",
    positive = true,
}) {
    const hasChange = change !== undefined && change !== null && change !== "";

    return (
        <article className="kpi-card" aria-label={`${label}: ${value ?? "No data"}`}>
            <div className="kpi-card-top">
                <span className="kpi-label">{label}</span>

                {Icon && (
                    <span className={`kpi-icon kpi-icon-${tone}`} aria-hidden="true">
                        <Icon size={19} strokeWidth={1.8} />
                    </span>
                )}
            </div>

            <div className="kpi-value">
                {value ?? "—"}
            </div>

            <div className="kpi-footer">
                {hasChange ? (
                    <span
                        className={`kpi-change ${positive ? "is-positive" : "is-negative"
                            }`}
                        aria-label={`${positive ? "Positive" : "Negative"} change: ${change}`}
                    >
                        {positive ? (
                            <ArrowUpRight size={14} aria-hidden="true" />
                        ) : (
                            <ArrowDownRight size={14} aria-hidden="true" />
                        )}
                        {change}
                    </span>
                ) : (
                    <span className="kpi-change">No comparison</span>
                )}

                {detail && <span className="kpi-detail">{detail}</span>}
            </div>
        </article>
    );
}
