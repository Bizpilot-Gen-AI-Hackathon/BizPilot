
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { formatKES } from "../mocks/data";

const COLORS = {
  green: "#16845b",
  greenLight: "#a6bcae",
  grid: "#e9ece5",
  text: "#69736a",
  muted: "#8a9188",
  surface: "#ffffff",
  border: "#e7eae3",
};

const axisStyle = {
  fill: COLORS.muted,
  fontSize: 11,
  fontFamily: "inherit",
};

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  backgroundColor: COLORS.surface,
  padding: "10px 12px",
  boxShadow: "0 4px 16px rgba(28, 51, 35, 0.06)",
  fontSize: 12,
};

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div style={tooltipStyle}>
      {label && (
        <p
          style={{
            margin: "0 0 8px",
            color: COLORS.text,
            fontWeight: 600,
          }}
        >
          {label}
        </p>
      )}

      {payload.map((item) => (
        <div
          key={item.dataKey}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            marginTop: 5,
          }}
        >
          <span style={{ color: item.color || COLORS.text }}>
            {item.name || item.dataKey}
          </span>

          <strong style={{ color: "#24372b", fontWeight: 600 }}>
            {formatter ? formatter(item.value, item.dataKey) : item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function SalesChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -18, bottom: 4 }}
      >
        <defs>
          <linearGradient
            id="bizpilotSalesFill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={COLORS.green}
              stopOpacity={0.16}
            />
            <stop
              offset="95%"
              stopColor={COLORS.green}
              stopOpacity={0.01}
            />
          </linearGradient>
        </defs>

        <CartesianGrid
          stroke={COLORS.grid}
          strokeDasharray="3 5"
          vertical={false}
        />

        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={axisStyle}
          dy={10}
          minTickGap={18}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={axisStyle}
          tickFormatter={(value) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}m`;
            }

            if (value >= 1000) {
              return `${Math.round(value / 1000)}k`;
            }

            return value;
          }}
          width={42}
        />

        <Tooltip
          content={
            <ChartTooltip
              formatter={(value, key) =>
                key === "sales" || key === "profit"
                  ? formatKES(value)
                  : value
              }
            />
          }
          cursor={{
            stroke: "#cbd8ce",
            strokeDasharray: "3 3",
          }}
        />

        <Area
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke={COLORS.green}
          strokeWidth={2.5}
          fill="url(#bizpilotSalesFill)"
          activeDot={{
            r: 4,
            fill: COLORS.green,
            stroke: "#ffffff",
            strokeWidth: 2,
          }}
          dot={false}
        />

        <Area
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke={COLORS.greenLight}
          strokeWidth={2}
          fill="none"
          activeDot={{
            r: 4,
            fill: COLORS.greenLight,
            stroke: "#ffffff",
            strokeWidth: 2,
          }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProductBarChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
        barSize={12}
      >
        <CartesianGrid
          stroke={COLORS.grid}
          strokeDasharray="3 5"
          horizontal={false}
        />

        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={axisStyle}
          allowDecimals={false}
        />

        <YAxis
          type="category"
          dataKey="name"
          width={110}
          axisLine={false}
          tickLine={false}
          tick={{
            fill: COLORS.text,
            fontSize: 11,
            fontFamily: "inherit",
          }}
          interval={0}
        />

        <Tooltip
          content={
            <ChartTooltip
              formatter={(value) => `${value} units`}
            />
          }
          cursor={{ fill: "#f4f7f3" }}
        />

        <Bar
          dataKey="sold"
          name="Units sold"
          fill={COLORS.green}
          radius={[0, 4, 4, 0]}
          minPointSize={2}
          maxBarSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default SalesChart;
