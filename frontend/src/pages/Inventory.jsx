import React, { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  Search,
  SlidersHorizontal,
  PackageOpen,
  AlertTriangle,
  PackageCheck,
  TrendingUp,
  RotateCcw,
  CircleAlert,
} from "lucide-react";
import { products } from "../mocks/data";

const COLORS = {
  green: "#16845B",
  greenDark: "#126747",
  greenLight: "#E8F5EE",
  ink: "#172B23",
  muted: "#748078",
  border: "#E5EBE7",
  surface: "#FFFFFF",
  canvas: "#F7F9F7",
  amber: "#A96B13",
  amberLight: "#FFF4DF",
  red: "#B63F3F",
  redLight: "#FCECEC",
  blue: "#5377A8",
  blueLight: "#EDF2FA",
};

const CURRENCY_LOCALES = {
  KES: "en-KE",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  UGX: "en-UG",
  TZS: "en-TZ",
  NGN: "en-NG",
  ZAR: "en-ZA",
  INR: "en-IN",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
  CNY: "zh-CN",
  AED: "en-AE",
};

function formatCurrency(amount, currency = "KES", languageCode = "en") {
  const value = Number(amount) || 0;
  const code = String(currency || "KES").toUpperCase();
  const locale =
    CURRENCY_LOCALES[code] ||
    (languageCode === "en" ? "en-KE" : languageCode);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}

function formatNumber(value, languageCode = "en") {
  try {
    return new Intl.NumberFormat(languageCode || "en").format(
      Number(value) || 0
    );
  } catch {
    return String(Number(value) || 0);
  }
}

function getStockStatus(product) {
  const stock = Number(product.stock) || 0;
  const reorderLevel = Number(product.reorderAt ?? 5);

  if (stock <= 0) {
    return {
      label: "Out of stock",
      color: COLORS.red,
      background: COLORS.redLight,
      icon: <CircleAlert size={14} />,
    };
  }

  if (stock <= reorderLevel) {
    return {
      label: "Low stock",
      color: COLORS.amber,
      background: COLORS.amberLight,
      icon: <AlertTriangle size={14} />,
    };
  }

  return {
    label: "In stock",
    color: COLORS.greenDark,
    background: COLORS.greenLight,
    icon: <PackageCheck size={14} />,
  };
}

function IconBox({
  children,
  background = COLORS.greenLight,
  color = COLORS.green,
}) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        flex: "0 0 44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        background,
        color,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  accent = COLORS.green,
  iconBackground = COLORS.greenLight,
  valueSize = 29,
}) {
  return (
    <article
      style={{
        minWidth: 0,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        padding: "21px 22px",
        boxShadow: "0 3px 12px rgba(24, 55, 39, 0.035)",
        display: "flex",
        flexDirection: "column",
        gap: 17,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.muted,
            lineHeight: 1.5,
          }}
        >
          {label}
        </span>

        <IconBox background={iconBackground} color={accent}>
          {icon}
        </IconBox>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          title={String(value)}
          style={{
            fontSize: valueSize,
            fontWeight: 750,
            color: COLORS.ink,
            letterSpacing: "-1.15px",
            lineHeight: 1.2,
            overflowWrap: "anywhere",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>

        <p
          style={{
            margin: "9px 0 0",
            color: COLORS.muted,
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          height: 3,
          width: 38,
          background: accent,
          opacity: 0.75,
          borderRadius: 99,
        }}
      />
    </article>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 14,
        marginBottom: 21,
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              color: COLORS.green,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "1.5px",
              marginBottom: 7,
            }}
          >
            {eyebrow}
          </div>
        )}

        <h3
          style={{
            margin: 0,
            color: COLORS.ink,
            fontSize: 19,
            fontWeight: 750,
            letterSpacing: "-0.45px",
          }}
        >
          {title}
        </h3>

        {description && (
          <p
            style={{
              color: COLORS.muted,
              fontSize: 13,
              lineHeight: 1.65,
              margin: "6px 0 0",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

const tableCellStyle = {
  padding: "15px",
  borderBottom: `1px solid ${COLORS.border}`,
  color: "#58685E",
  verticalAlign: "middle",
};

export default function Inventory({ preferences }) {
  const currency = preferences?.currency || "KES";
  const languageCode = preferences?.languageCode || "en";

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All items");
  const [exportMessage, setExportMessage] = useState("");

  const inventory = useMemo(() => {
    return products.map((product) => ({
      ...product,
      stock: Number(product.stock) || 0,
      cost: Number(product.cost) || 0,
      reorderAt: Number(product.reorderAt ?? 5),
    }));
  }, []);

  const filteredProducts = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    return inventory.filter((product) => {
      const searchableText =
        `${product.name || ""} ${product.sku || ""} ${
          product.category || ""
        }`.toLowerCase();

      const matchesSearch = searchableText.includes(searchTerm);

      const matchesFilter =
        filter === "All items" ||
        (filter === "Low stock" && product.stock <= product.reorderAt) ||
        (filter === "In stock" && product.stock > product.reorderAt);

      return matchesSearch && matchesFilter;
    });
  }, [inventory, query, filter]);

  const statistics = useMemo(() => {
    const totalUnits = inventory.reduce(
      (sum, product) => sum + product.stock,
      0
    );

    const lowStockProducts = inventory.filter(
      (product) => product.stock <= product.reorderAt
    );

    const outOfStockCount = inventory.filter(
      (product) => product.stock <= 0
    ).length;

    const stockValue = inventory.reduce(
      (sum, product) => sum + product.stock * product.cost,
      0
    );

    const potentialSalesValue = inventory.reduce(
      (sum, product) =>
        sum + product.stock * (Number(product.price) || 0),
      0
    );

    return {
      totalProducts: inventory.length,
      totalUnits,
      lowStockCount: lowStockProducts.length,
      outOfStockCount,
      stockValue,
      potentialSalesValue,
      categoriesCount: new Set(
        inventory.map((product) => product.category).filter(Boolean)
      ).size,
    };
  }, [inventory]);

  function clearFilters() {
    setQuery("");
    setFilter("All items");
  }

  function exportInventory() {
    const headers = [
      "Product",
      "SKU",
      "Category",
      "Quantity On Hand",
      "Reorder Level",
      `Unit Cost (${currency})`,
      `Total Stock Cost (${currency})`,
      "Status",
    ];

    const rows = filteredProducts.map((product) => {
      const status =
        product.stock <= 0
          ? "Out of stock"
          : product.stock <= product.reorderAt
            ? "Low stock"
            : "In stock";

      return [
        product.name,
        product.sku,
        product.category,
        product.stock,
        product.reorderAt,
        product.cost,
        product.stock * product.cost,
        status,
      ];
    });

    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setExportMessage(
      `Inventory export prepared for ${filteredProducts.length} products.`
    );

    window.setTimeout(() => setExportMessage(""), 4000);
  }

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "11px 15px",
    minHeight: 42,
    borderRadius: 11,
    border: `1px solid ${COLORS.border}`,
    fontSize: 13,
    fontWeight: 650,
    cursor: "pointer",
  };

  const inputStyle = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    color: COLORS.ink,
    fontSize: 13,
    outlineColor: COLORS.green,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 25,
        width: "100%",
        minWidth: 0,
        color: COLORS.ink,
        boxSizing: "border-box",
      }}
    >
      {/* Page heading */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "1.7px",
              color: COLORS.green,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            STOCK CONTROL
          </div>

          <h2
            style={{
              fontSize: 29,
              fontWeight: 800,
              letterSpacing: "-1px",
              margin: 0,
              color: COLORS.ink,
            }}
          >
            Inventory
          </h2>

          <p
            style={{
              color: COLORS.muted,
              fontSize: 13,
              margin: "8px 0 0",
              lineHeight: 1.65,
            }}
          >
            Keep the right products on your shelves and spot risks early.
          </p>
        </div>

        <button
          type="button"
          onClick={exportInventory}
          style={{
            ...buttonStyle,
            background: COLORS.surface,
            color: COLORS.ink,
          }}
        >
          <ArrowDownToLine size={16} />
          Export inventory
        </button>
      </header>

      {/* Inventory statistics */}
      <section
        aria-label="Inventory statistics"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 16,
          width: "100%",
        }}
      >
        <StatCard
          label="Total products"
          value={formatNumber(statistics.totalProducts, languageCode)}
          description={`${statistics.categoriesCount} categories in the catalogue`}
          icon={<Boxes size={20} />}
        />

        <StatCard
          label="Units on hand"
          value={formatNumber(statistics.totalUnits, languageCode)}
          description="Combined quantity across all products"
          icon={<PackageOpen size={20} />}
          accent={COLORS.blue}
          iconBackground={COLORS.blueLight}
        />

        <StatCard
          label="Low-stock items"
          value={formatNumber(statistics.lowStockCount, languageCode)}
          description={
            statistics.outOfStockCount > 0
              ? `${statistics.outOfStockCount} products currently out of stock`
              : "Items at or below their reorder level"
          }
          icon={<AlertTriangle size={20} />}
          accent={
            statistics.lowStockCount > 0 ? COLORS.amber : COLORS.green
          }
          iconBackground={
            statistics.lowStockCount > 0
              ? COLORS.amberLight
              : COLORS.greenLight
          }
        />

        <StatCard
          label="Stock value"
          value={formatCurrency(
            statistics.stockValue,
            currency,
            languageCode
          )}
          description="Estimated value at unit cost"
          icon={<TrendingUp size={20} />}
          valueSize={24}
        />
      </section>

      {/* Stock alerts */}
      {statistics.lowStockCount > 0 && (
        <section
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 13,
            padding: "16px 18px",
            border: "1px solid #F0DFB9",
            borderRadius: 14,
            background: "#FFFAEF",
          }}
        >
          <IconBox
            background={COLORS.amberLight}
            color={COLORS.amber}
          >
            <AlertTriangle size={19} />
          </IconBox>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: "1px 0 5px",
                color: "#775017",
                fontSize: 14,
                fontWeight: 750,
              }}
            >
              Inventory needs attention
            </h3>

            <p
              style={{
                margin: 0,
                color: "#8A6A37",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              {statistics.lowStockCount} product
              {statistics.lowStockCount === 1 ? " is" : "s are"} at or below
              the reorder threshold. Review these items before stock runs out.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFilter("Low stock");
              setQuery("");
            }}
            style={{
              ...buttonStyle,
              minHeight: 36,
              padding: "8px 11px",
              background: "#FFFFFF",
              color: "#775017",
              borderColor: "#F0DFB9",
              flexShrink: 0,
            }}
          >
            Review items
            <ArrowUpRight size={14} />
          </button>
        </section>
      )}

      {/* Inventory table */}
      <section
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 18,
          overflow: "hidden",
          minWidth: 0,
          boxShadow: "0 3px 12px rgba(24, 55, 39, 0.035)",
        }}
      >
        <div style={{ padding: "22px 22px 18px" }}>
          <SectionHeading
            title="Stock overview"
            description="Monitor quantities, unit costs and reorder thresholds."
            action={
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: COLORS.greenLight,
                  color: COLORS.greenDark,
                  borderRadius: 99,
                  padding: "7px 11px",
                  fontSize: 11,
                  fontWeight: 750,
                }}
              >
                <Boxes size={14} />
                {formatNumber(filteredProducts.length, languageCode)} shown
              </span>
            }
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <label
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                gap: 9,
                flex: "1 1 230px",
                padding: "0 12px",
              }}
            >
              <Search size={16} color={COLORS.muted} />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, SKU or category..."
                aria-label="Search inventory"
                style={{
                  width: "100%",
                  minWidth: 0,
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  padding: "12px 0",
                  color: COLORS.ink,
                  fontSize: 13,
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: "0 1 auto",
              }}
            >
              <SlidersHorizontal size={15} color={COLORS.muted} />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter inventory by stock status"
                style={{ ...inputStyle, width: "auto", minWidth: 145 }}
              >
                <option>All items</option>
                <option>Low stock</option>
                <option>In stock</option>
              </select>
            </label>

            {(query || filter !== "All items") && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  ...buttonStyle,
                  padding: "10px 12px",
                  background: "#FFFFFF",
                  color: COLORS.muted,
                }}
              >
                <RotateCcw size={14} />
                Clear
              </button>
            )}
          </div>

          {exportMessage && (
            <p
              role="status"
              style={{
                color: COLORS.greenDark,
                fontSize: 12,
                margin: "13px 0 0",
              }}
            >
              {exportMessage}
            </p>
          )}
        </div>

        <div
          style={{
            width: "100%",
            overflowX: "auto",
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              minWidth: 850,
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: COLORS.canvas }}>
                {[
                  "PRODUCT",
                  "SKU",
                  "CATEGORY",
                  "ON HAND",
                  "REORDER LEVEL",
                  "UNIT COST",
                  "STATUS",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "14px 15px",
                      fontSize: 10,
                      letterSpacing: "0.7px",
                      color: COLORS.muted,
                      fontWeight: 800,
                      borderBottom: `1px solid ${COLORS.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product);

                return (
                  <tr key={product.id ?? product.sku ?? product.name}>
                    <td style={tableCellStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          minWidth: 160,
                        }}
                      >
                        <IconBox>
                          <PackageOpen size={17} />
                        </IconBox>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <strong
                            style={{
                              color: COLORS.ink,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {product.name}
                          </strong>

                          <span
                            style={{
                              color: COLORS.muted,
                              fontSize: 11,
                            }}
                          >
                            {product.sku || "No SKU"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {product.sku || "—"}
                    </td>

                    <td style={tableCellStyle}>
                      <span
                        style={{
                          background: COLORS.canvas,
                          color: "#4D6256",
                          padding: "6px 9px",
                          borderRadius: 7,
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.category || "Uncategorised"}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      <strong
                        style={{
                          color:
                            product.stock <= product.reorderAt
                              ? status.color
                              : COLORS.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatNumber(product.stock, languageCode)}
                      </strong>

                      <span
                        style={{
                          marginLeft: 5,
                          color: COLORS.muted,
                          fontSize: 11,
                        }}
                      >
                        units
                      </span>
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatNumber(product.reorderAt, languageCode)} units
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        color: COLORS.ink,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(
                        product.cost,
                        currency,
                        languageCode
                      )}
                    </td>

                    <td style={tableCellStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "7px 9px",
                          borderRadius: 8,
                          background: status.background,
                          color: status.color,
                          fontSize: 11,
                          fontWeight: 750,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div
              style={{
                padding: "48px 20px",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <IconBox>
                <PackageOpen size={22} />
              </IconBox>

              <strong style={{ color: COLORS.ink, fontSize: 14 }}>
                No inventory items found
              </strong>

              <span style={{ color: COLORS.muted, fontSize: 12 }}>
                Try another search term or stock filter.
              </span>

              <button
                type="button"
                onClick={clearFilters}
                style={{
                  ...buttonStyle,
                  marginTop: 5,
                  background: "#FFFFFF",
                  color: COLORS.greenDark,
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <footer
          style={{
            padding: "15px 22px",
            borderTop: `1px solid ${COLORS.border}`,
            background: "#FCFDFC",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 11, color: COLORS.muted }}>
            Showing {formatNumber(filteredProducts.length, languageCode)} of{" "}
            {formatNumber(inventory.length, languageCode)} products
          </span>

          <span
            style={{
              background: "#EEF2EF",
              color: "#617066",
              borderRadius: 7,
              padding: "6px 9px",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "1px",
            }}
          >
            DEMO DATA
          </span>
        </footer>
      </section>

      {/* Stock valuation summary */}
      <section
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 18,
          padding: 23,
          boxShadow: "0 3px 12px rgba(24, 55, 39, 0.035)",
        }}
      >
        <SectionHeading
          eyebrow="INVENTORY INSIGHTS"
          title="Stock valuation"
          description="A financial overview of the inventory currently recorded."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 14,
          }}
        >
          {[
            {
              label: "Stock at cost",
              value: statistics.stockValue,
              description: "Current quantity multiplied by unit cost",
            },
            {
              label: "Potential sales value",
              value: statistics.potentialSalesValue,
              description: "Estimated revenue if current stock sells",
            },
            {
              label: "Potential gross profit",
              value: statistics.potentialSalesValue - statistics.stockValue,
              description: "Potential sales less estimated stock cost",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: 17,
                borderRadius: 13,
                background: COLORS.canvas,
                border: `1px solid ${COLORS.border}`,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  color: COLORS.ink,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.6px",
                  overflowWrap: "anywhere",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatCurrency(item.value, currency, languageCode)}
              </div>

              <p
                style={{
                  margin: "9px 0 0",
                  color: COLORS.muted,
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}