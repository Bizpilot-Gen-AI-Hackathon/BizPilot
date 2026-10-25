import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  PackageOpen,
  ArrowUpRight,
  X,
  PackageCheck,
  AlertTriangle,
  Boxes,
  TrendingUp,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import { products } from "../mocks/data";

const CATEGORIES = [
  "Groceries",
  "Dairy",
  "Bakery",
  "Household",
  "Beverages",
];

const EMPTY_FORM = {
  name: "",
  category: "Groceries",
  cost: "",
  price: "",
  stock: "",
};

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
  const safeAmount = Number(amount) || 0;
  const safeCurrency = String(currency || "KES").toUpperCase();
  const locale =
    CURRENCY_LOCALES[safeCurrency] ||
    (languageCode === "en" ? "en-KE" : languageCode);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(safeAmount);
  } catch {
    return `${safeCurrency} ${safeAmount.toLocaleString()}`;
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

function getGrossMargin(product) {
  const price = Number(product.price) || 0;
  const cost = Number(product.cost) || 0;

  return price > 0 ? ((price - cost) / price) * 100 : 0;
}

function getStockStatus(product) {
  const stock = Number(product.stock) || 0;
  const reorderAt = Number(product.reorderAt ?? 5);

  if (stock <= 0) {
    return {
      label: "Out of stock",
      color: COLORS.red,
      background: COLORS.redLight,
    };
  }

  if (stock <= reorderAt) {
    return {
      label: "Low stock",
      color: COLORS.amber,
      background: COLORS.amberLight,
    };
  }

  return {
    label: "In stock",
    color: COLORS.greenDark,
    background: COLORS.greenLight,
  };
}

function IconBox({ children, background = COLORS.greenLight, color = COLORS.green }) {
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
        marginBottom: 22,
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

export default function Products({ preferences }) {
  const currency = preferences?.currency || "KES";
  const languageCode = preferences?.languageCode || "en";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [showForm, setShowForm] = useState(false);
  const [extraProducts, setExtraProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const allProducts = useMemo(
    () => [...extraProducts, ...products],
    [extraProducts]
  );

  const filteredProducts = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    return allProducts.filter((product) => {
      const searchableText =
        `${product.name || ""} ${product.sku || ""} ${
          product.category || ""
        }`.toLowerCase();

      return (
        searchableText.includes(searchTerm) &&
        (category === "All categories" || product.category === category)
      );
    });
  }, [allProducts, query, category]);

  const statistics = useMemo(() => {
    const totalUnits = filteredProducts.reduce(
      (sum, product) => sum + (Number(product.stock) || 0),
      0
    );

    const lowStockCount = filteredProducts.filter(
      (product) =>
        (Number(product.stock) || 0) <= Number(product.reorderAt ?? 5)
    ).length;

    const inventoryValue = filteredProducts.reduce(
      (sum, product) =>
        sum +
        (Number(product.cost) || 0) * (Number(product.stock) || 0),
      0
    );

    const potentialSales = filteredProducts.reduce(
      (sum, product) =>
        sum +
        (Number(product.price) || 0) * (Number(product.stock) || 0),
      0
    );

    return {
      totalProducts: filteredProducts.length,
      totalUnits,
      lowStockCount,
      inventoryValue,
      potentialSales,
    };
  }, [filteredProducts]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  }

  function toggleForm() {
    setShowForm((current) => {
      if (current) {
        setForm(EMPTY_FORM);
        setFormError("");
      }

      return !current;
    });
  }

  function submit(event) {
    event.preventDefault();
    setFormError("");

    const name = form.name.trim();
    const cost = Number(form.cost || 0);
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!name) {
      setFormError("Please enter a product name.");
      return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      setFormError("Unit cost must be zero or greater.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Selling price must be greater than zero.");
      return;
    }

    if (
      !Number.isFinite(stock) ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {
      setFormError("Opening stock must be a whole number of zero or more.");
      return;
    }

    const newProduct = {
      id: `NEW-${Date.now()}`,
      sku: `NEW-${String(extraProducts.length + 1).padStart(3, "0")}`,
      name,
      category: form.category,
      cost,
      price,
      stock,
      reorderAt: 5,
      sold: 0,
      status: stock === 0 ? "Out of stock" : stock <= 5 ? "Low stock" : "In stock",
    };

    setExtraProducts((current) => [newProduct, ...current]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setQuery("");
    setCategory("All categories");
  }

  function clearFilters() {
    setQuery("");
    setCategory("All categories");
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
    transition: "background 150ms ease",
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

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 12,
    fontWeight: 650,
    color: COLORS.ink,
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
      {/* Page header */}
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
            PRODUCT CATALOGUE
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
            Products
          </h2>

          <p
            style={{
              color: COLORS.muted,
              fontSize: 13,
              margin: "8px 0 0",
              lineHeight: 1.65,
            }}
          >
            Manage your catalogue, pricing and product performance.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleForm}
          aria-expanded={showForm}
          style={{
            ...buttonStyle,
            border: "1px solid #16845B",
            background: showForm ? "#FFFFFF" : COLORS.green,
            color: showForm ? COLORS.ink : "#FFFFFF",
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add product"}
        </button>
      </header>

      {/* Overview cards: fully styled independently of the app CSS */}
      <section
        aria-label="Product statistics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 16,
          width: "100%",
        }}
      >
        <StatCard
          label="Products displayed"
          value={formatNumber(statistics.totalProducts, languageCode)}
          description="Products matching your current filters"
          icon={<PackageOpen size={20} />}
        />

        <StatCard
          label="Units in stock"
          value={formatNumber(statistics.totalUnits, languageCode)}
          description="Combined quantity of displayed products"
          icon={<Boxes size={20} />}
          accent="#5377A8"
          iconBackground="#EDF2FA"
        />

        <StatCard
          label="Low-stock items"
          value={formatNumber(statistics.lowStockCount, languageCode)}
          description="Items at or below their reorder level"
          icon={<AlertTriangle size={20} />}
          accent={statistics.lowStockCount > 0 ? COLORS.amber : COLORS.green}
          iconBackground={
            statistics.lowStockCount > 0
              ? COLORS.amberLight
              : COLORS.greenLight
          }
        />

        <StatCard
          label="Inventory cost value"
          value={formatCurrency(
            statistics.inventoryValue,
            currency,
            languageCode
          )}
          description="Estimated cost of current displayed stock"
          icon={<DollarSign size={20} />}
          accent={COLORS.green}
          valueSize={24}
        />
      </section>

      {/* Add product form */}
      {showForm && (
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
            eyebrow="CATALOGUE MANAGEMENT"
            title="Add a product"
            description={`Enter product details. Prices will be displayed in ${currency}.`}
          />

          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            {formError && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: COLORS.redLight,
                  color: COLORS.red,
                  fontSize: 13,
                }}
              >
                <AlertTriangle size={16} />
                {formError}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                gap: 17,
              }}
            >
              <label style={fieldStyle}>
                Product name
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="e.g. Brown bread 400g"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                  style={inputStyle}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                Cost per unit ({currency})
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(event) => updateForm("cost", event.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Selling price ({currency})
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateForm("price", event.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Opening stock
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => updateForm("stock", event.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="submit"
                style={{
                  ...buttonStyle,
                  background: COLORS.green,
                  color: "#FFFFFF",
                  borderColor: COLORS.green,
                }}
              >
                Save product
                <ArrowUpRight size={15} />
              </button>

              <button
                type="button"
                onClick={toggleForm}
                style={{
                  ...buttonStyle,
                  background: "#FFFFFF",
                  color: COLORS.ink,
                }}
              >
                Cancel
              </button>
            </div>

            <p style={{ margin: 0, color: COLORS.muted, fontSize: 12 }}>
              Products added here remain in local page state for this session.
              They are not saved to a permanent database.
            </p>
          </form>
        </section>
      )}

      {/* Main catalogue */}
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
            title={`All products (${formatNumber(
              filteredProducts.length,
              languageCode
            )})`}
            description="Product information, selling prices and stock levels."
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
                <PackageCheck size={14} />
                {formatNumber(filteredProducts.length, languageCode)} items
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
                aria-label="Search products"
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

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by category"
              style={{ ...inputStyle, width: "auto", minWidth: 155 }}
            >
              <option>All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {(query || category !== "All categories") && (
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
              minWidth: 880,
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: COLORS.canvas }}>
                {[
                  "PRODUCT",
                  "CATEGORY",
                  "SELLING PRICE",
                  "UNIT COST",
                  "GROSS MARGIN",
                  "UNITS SOLD",
                  "STOCK",
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
                const margin = getGrossMargin(product);
                const stockStatus = getStockStatus(product);

                return (
                  <tr key={product.id ?? product.sku ?? product.name}>
                    <td style={tableCellStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          minWidth: 180,
                        }}
                      >
                        <IconBox>
                          <PackageOpen size={17} />
                        </IconBox>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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

                    <td
                      style={{
                        ...tableCellStyle,
                        color: COLORS.ink,
                        fontWeight: 750,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(product.price, currency, languageCode)}
                    </td>

                    <td style={{ ...tableCellStyle, whiteSpace: "nowrap" }}>
                      {formatCurrency(
                        product.cost || 0,
                        currency,
                        languageCode
                      )}
                    </td>

                    <td style={tableCellStyle}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 7,
                          minWidth: 85,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: margin < 0 ? COLORS.red : COLORS.greenDark,
                          }}
                        >
                          {margin.toFixed(1)}%
                        </span>

                        <div
                          style={{
                            width: 70,
                            height: 5,
                            background: "#EDF1EE",
                            borderRadius: 99,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.max(0, Math.min(margin, 100))}%`,
                              height: "100%",
                              borderRadius: 99,
                              background: margin < 0 ? COLORS.red : COLORS.green,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td style={tableCellStyle}>
                      {formatNumber(product.sold || 0, languageCode)}
                    </td>

                    <td style={tableCellStyle}>
                      <div
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            background: stockStatus.background,
                            color: stockStatus.color,
                            padding: "6px 9px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 750,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatNumber(product.stock || 0, languageCode)} units
                        </span>

                        <span
                          style={{
                            fontSize: 10,
                            color: stockStatus.color,
                          }}
                        >
                          {stockStatus.label}
                        </span>
                      </div>
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
                No products found
              </strong>

              <span style={{ color: COLORS.muted, fontSize: 12 }}>
                Try a different search term or category.
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
            {formatNumber(allProducts.length, languageCode)} products
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
            LOCAL DEMO
          </span>
        </footer>
      </section>

      {/* Inventory value breakdown */}
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
          title="Inventory value overview"
          description="Understand the estimated value of your current stock."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 14,
          }}
        >
          {[
            {
              label: "Inventory cost value",
              value: statistics.inventoryValue,
              description: "Stock quantity × unit cost",
            },
            {
              label: "Potential sales value",
              value: statistics.potentialSales,
              description: "Stock quantity × selling price",
            },
            {
              label: "Potential gross profit",
              value: statistics.potentialSales - statistics.inventoryValue,
              description: "Potential sales minus inventory cost",
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

const tableCellStyle = {
  padding: "15px",
  borderBottom: `1px solid ${COLORS.border}`,
  color: "#58685E",
  verticalAlign: "middle",
};
