import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAdminUser, getAdminUser } from "../services/adminAuthService";
import useResponsive from "../hooks/useResponsive";

const API_CANDIDATES = [
  "http://127.0.0.1/sportevent-api",
  "http://localhost/sportevent-api",
];

const MONTH_OPTIONS = [
  { value: "all", label: "כל החודשים" },
  { value: "1", label: "ינואר" },
  { value: "2", label: "פברואר" },
  { value: "3", label: "מרץ" },
  { value: "4", label: "אפריל" },
  { value: "5", label: "מאי" },
  { value: "6", label: "יוני" },
  { value: "7", label: "יולי" },
  { value: "8", label: "אוגוסט" },
  { value: "9", label: "ספטמבר" },
  { value: "10", label: "אוקטובר" },
  { value: "11", label: "נובמבר" },
  { value: "12", label: "דצמבר" },
];

const YEAR_OPTIONS = ["2025", "2026", "2027"];

async function apiRequest(endpoint, options = {}) {
  let lastError = null;

  for (const base of API_CANDIDATES) {
    try {
      const response = await fetch(`${base}/${endpoint}`, options);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("API request failed");
}

function buildDashboardEndpoint(year, month) {
  const params = new URLSearchParams();

  if (year) {
    params.set("year", year);
  }

  if (month && month !== "all") {
    params.set("month", month);
  }

  const queryString = params.toString();

  return queryString
    ? `admin_dashboard_summary.php?${queryString}`
    : "admin_dashboard_summary.php";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPaymentMethod(value) {
  if (!value) {
    return "-";
  }

  if (value === "credit_card") {
    return "כרטיס אשראי";
  }

  if (value === "digital_wallet") {
    return "ארנק דיגיטלי";
  }

  return value;
}

function StatCard({ title, value, subtitle }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "18px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: "15px", color: "#4b5563", marginBottom: "8px" }}>
        {title}
      </div>

      <div style={{ fontSize: "30px", fontWeight: "800", color: "#0b2a5b" }}>
        {value}
      </div>

      {subtitle ? (
        <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function KeyValueChips({ dataMap, emptyText }) {
  const entries = Object.entries(dataMap || {});

  if (!entries.length) {
    return (
      <div style={{ color: "#6b7280", fontSize: "15px" }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      {entries.map(([key, value]) => (
        <div
          key={key}
          style={{
            background: "#eef4ff",
            color: "#173d7a",
            borderRadius: "999px",
            padding: "8px 14px",
            fontSize: "14px",
            fontWeight: "700",
          }}
        >
          {key}: {value}
        </div>
      ))}
    </div>
  );
}

function buildReportHtml(summary, filterLabel) {
  const topEventsRows = (summary.top_events || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.event_name)}</td>
          <td>${escapeHtml(item.event_id)}</td>
          <td>${escapeHtml(item.tickets_sold)}</td>
          <td>${escapeHtml(item.orders_count)}</td>
          <td>${escapeHtml(item.revenue_label)}</td>
        </tr>
      `
    )
    .join("");

  const recentOrdersRows = (summary.recent_orders || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.order_code)}</td>
          <td>${escapeHtml(item.event_name)}</td>
          <td>${escapeHtml(item.username)}</td>
          <td>${escapeHtml(item.tickets_count)}</td>
          <td>${escapeHtml(item.price)}</td>
          <td>${escapeHtml(item.status_label)}</td>
          <td>${escapeHtml(formatPaymentMethod(item.payment_method))}</td>
          <td>${escapeHtml(item.purchase_source || "-")}</td>
          <td>${escapeHtml(item.purchase_date || "-")}</td>
        </tr>
      `
    )
    .join("");

  const waitlistRows = Object.entries(summary.waitlist_status_counts || {})
    .map(
      ([key, value]) => `
        <tr>
          <td>${escapeHtml(key)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");

  const seatRows = Object.entries(summary.seat_status_counts || {})
    .map(
      ([key, value]) => `
        <tr>
          <td>${escapeHtml(key)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>SportEvent Admin Dashboard Export</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          direction: rtl;
          padding: 24px;
          color: #111827;
        }

        h1 {
          margin: 0 0 8px;
          color: #0b2a5b;
          font-size: 30px;
        }

        h2 {
          margin-top: 28px;
          color: #173d7a;
          font-size: 22px;
        }

        .subtitle {
          color: #374151;
          margin-bottom: 20px;
          font-size: 15px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .stat {
          border: 1px solid #dbe3f0;
          border-radius: 10px;
          padding: 12px;
          background: #f8fbff;
        }

        .stat-title {
          color: #4b5563;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .stat-value {
          color: #0b2a5b;
          font-size: 22px;
          font-weight: 800;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }

        th, td {
          border: 1px solid #dbe3f0;
          padding: 8px;
          text-align: right;
        }

        th {
          background: #e9eff9;
        }

        @media print {
          body {
            padding: 10px;
          }

          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>דוח דשבורד מנהל SportEvent</h1>
      <div class="subtitle">תקופה: ${escapeHtml(filterLabel)} | הופק בתאריך: ${escapeHtml(new Date().toLocaleString("he-IL"))}</div>

      <div class="stats">
        <div class="stat">
          <div class="stat-title">סה"כ הזמנות</div>
          <div class="stat-value">${escapeHtml(summary.orders_total)}</div>
        </div>

        <div class="stat">
          <div class="stat-title">הזמנות ששולמו</div>
          <div class="stat-value">${escapeHtml(summary.paid_orders)}</div>
        </div>

        <div class="stat">
          <div class="stat-title">הכנסות</div>
          <div class="stat-value">${escapeHtml(summary.gross_revenue_label)}</div>
        </div>

        <div class="stat">
          <div class="stat-title">זיכויים</div>
          <div class="stat-value">${escapeHtml(summary.refund_total_label)}</div>
        </div>

        <div class="stat">
          <div class="stat-title">ממתינות לתשלום</div>
          <div class="stat-value">${escapeHtml(summary.pending_orders)}</div>
        </div>

        <div class="stat">
          <div class="stat-title">בוטלו</div>
          <div class="stat-value">${escapeHtml(summary.cancelled_orders)}</div>
        </div>

        <div class="stat">
          <div class="stat-title">פג תוקף</div>
          <div class="stat-value">${escapeHtml(summary.expired_orders)}</div>
        </div>

        <div class="stat">
          <div class="stat-title">רשימת המתנה</div>
          <div class="stat-value">${escapeHtml(summary.waitlist_total)}</div>
        </div>
      </div>

      <h2>אירועים מובילים לפי מכירות</h2>
      <table>
        <thead>
          <tr>
            <th>אירוע</th>
            <th>event_id</th>
            <th>כרטיסים</th>
            <th>הזמנות</th>
            <th>הכנסה</th>
          </tr>
        </thead>
        <tbody>
          ${topEventsRows || `<tr><td colspan="5">אין נתונים</td></tr>`}
        </tbody>
      </table>

      <h2>הזמנות אחרונות</h2>
      <table>
        <thead>
          <tr>
            <th>קוד הזמנה</th>
            <th>אירוע</th>
            <th>משתמש</th>
            <th>כמות</th>
            <th>מחיר</th>
            <th>סטטוס</th>
            <th>אמצעי תשלום</th>
            <th>מקור רכישה</th>
            <th>תאריך</th>
          </tr>
        </thead>
        <tbody>
          ${recentOrdersRows || `<tr><td colspan="9">אין נתונים</td></tr>`}
        </tbody>
      </table>

      <h2>סטטוס רשימת המתנה</h2>
      <table>
        <thead>
          <tr>
            <th>סטטוס</th>
            <th>כמות</th>
          </tr>
        </thead>
        <tbody>
          ${waitlistRows || `<tr><td colspan="2">אין נתונים</td></tr>`}
        </tbody>
      </table>

      <h2>סטטוס מלאי מושבים</h2>
      <table>
        <thead>
          <tr>
            <th>סטטוס</th>
            <th>כמות</th>
          </tr>
        </thead>
        <tbody>
          ${seatRows || `<tr><td colspan="2">אין נתונים</td></tr>`}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminDashboardPage() {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const adminUser = getAdminUser();

  const currentYear = String(new Date().getFullYear());

  const [selectedYear, setSelectedYear] = useState(
    YEAR_OPTIONS.includes(currentYear) ? currentYear : "2026"
  );
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [summary, setSummary] = useState({
    filter: {
      year: selectedYear,
      month: selectedMonth,
      label: "כל החודשים",
    },
    orders_total: 0,
    paid_orders: 0,
    pending_orders: 0,
    cancelled_orders: 0,
    expired_orders: 0,
    gross_revenue_label: "0 ₪",
    refund_total_label: "0 ₪",
    waitlist_total: 0,
    waitlist_status_counts: {},
    seat_inventory_total: 0,
    seat_status_counts: {},
    recent_orders: [],
    top_events: [],
  });

  const filterLabel = summary?.filter?.label || "כל החודשים";

  const dashboardStats = useMemo(() => {
    return [
      {
        title: "סה״כ הזמנות",
        value: summary.orders_total,
        subtitle: `לתקופה: ${filterLabel}`,
      },
      {
        title: "הזמנות ששולמו",
        value: summary.paid_orders,
        subtitle: `הכנסות: ${summary.gross_revenue_label}`,
      },
      {
        title: "הזמנות ממתינות",
        value: summary.pending_orders,
        subtitle: "הזמנות זמניות לפני תשלום",
      },
      {
        title: "הזמנות שבוטלו",
        value: summary.cancelled_orders,
        subtitle: `זיכויים: ${summary.refund_total_label}`,
      },
      {
        title: "פג תוקף",
        value: summary.expired_orders,
        subtitle: "הזמנות שלא הושלמו בזמן",
      },
      {
        title: "ממתינים בסולד אאוט",
        value: summary.waitlist_total,
        subtitle: "בקשות לפי התקופה שנבחרה",
      },
      {
        title: "מלאי מושבים",
        value: summary.seat_inventory_total,
        subtitle: "רשומות מלאי שעודכנו בתקופה",
      },
    ];
  }, [summary, filterLabel]);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const endpoint = buildDashboardEndpoint(selectedYear, selectedMonth);
      const data = await apiRequest(endpoint);
      setSummary(data.summary || {});
    } catch (error) {
      setErrorMessage(error.message || "טעינת הדשבורד נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = () => {
    clearAdminUser();
    navigate("/admin/login");
  };

  const handleApplyFilter = () => {
    loadDashboard();
  };

  const handleExportExcel = () => {
    const html = buildReportHtml(summary, filterLabel);
    const filename = `sportevent-dashboard-${selectedYear}-${selectedMonth}.xls`;

    downloadFile(
      filename,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
  };

  const handleExportPdf = () => {
    const html = buildReportHtml(summary, filterLabel);
    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      alert("הדפדפן חסם חלון חדש. יש לאפשר Pop-ups ואז לנסות שוב.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        padding: "24px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "36px", color: "#0b2a5b" }}>
              דשבורד מנהל
            </h1>

            <div style={{ marginTop: "8px", color: "#374151", fontSize: "16px" }}>
              מחובר כ: {adminUser?.full_name || adminUser?.username || "מנהל"}
            </div>

            <div style={{ marginTop: "8px", color: "#6b7280", fontSize: "15px" }}>
              תקופה נוכחית: {filterLabel}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={loadDashboard} style={buttonBlue}>
              רענון נתונים
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/events")}
              style={buttonTeal}
            >
              מעבר לניהול אירועים
            </button>

            <button type="button" onClick={handleLogout} style={buttonRed}>
              התנתקות
            </button>
          </div>
        </div>

        <div style={filterPanelStyle}>
          <div>
            <label style={labelStyle}>שנה</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={selectStyle}
            >
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>חודש</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={selectStyle}
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
            <button type="button" onClick={handleApplyFilter} style={buttonBlue}>
              החל סינון
            </button>

            <button type="button" onClick={handleExportExcel} style={buttonGreen}>
              ייצוא Excel
            </button>

            <button type="button" onClick={handleExportPdf} style={buttonPurple}>
              ייצוא PDF
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div
            style={{
              background: "#ffe8e8",
              color: "#9b1d1d",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontSize: "16px",
              fontWeight: "700",
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              fontSize: "18px",
              fontWeight: "700",
            }}
          >
            טוען נתונים...
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginBottom: "24px",
              }}
            >
              {dashboardStats.map((item) => (
                <StatCard
                  key={item.title}
                  title={item.title}
                  value={item.value}
                  subtitle={item.subtitle}
                />
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr",
                gap: "18px",
                marginBottom: "24px",
              }}
            >
              <div style={panelStyle}>
                <h2 style={panelTitleStyle}>אירועים מובילים לפי מכירות</h2>

                {summary.top_events?.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: "#e9eff9" }}>
                          <th style={thStyle}>אירוע</th>
                          <th style={thStyle}>event_id</th>
                          <th style={thStyle}>כרטיסים</th>
                          <th style={thStyle}>הזמנות</th>
                          <th style={thStyle}>הכנסה</th>
                        </tr>
                      </thead>

                      <tbody>
                        {summary.top_events.map((item) => (
                          <tr key={`${item.event_id}-${item.event_name}`}>
                            <td style={tdStyle}>{item.event_name}</td>
                            <td style={tdStyle}>{item.event_id}</td>
                            <td style={tdStyle}>{item.tickets_sold}</td>
                            <td style={tdStyle}>{item.orders_count}</td>
                            <td style={tdStyle}>{item.revenue_label}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: "#6b7280", fontSize: "15px" }}>
                    אין עדיין אירועים עם מכירות בתקופה שנבחרה.
                  </div>
                )}
              </div>

              <div style={panelStyle}>
                <h2 style={panelTitleStyle}>סטטוסים מרכזיים</h2>

                <div style={{ marginBottom: "18px" }}>
                  <div style={smallSectionTitle}>רשימת המתנה</div>

                  <KeyValueChips
                    dataMap={summary.waitlist_status_counts}
                    emptyText="אין נתוני רשימת המתנה"
                  />
                </div>

                <div>
                  <div style={smallSectionTitle}>מלאי מושבים</div>

                  <KeyValueChips
                    dataMap={summary.seat_status_counts}
                    emptyText="אין נתוני מלאי מושבים"
                  />
                </div>
              </div>
            </div>

            <div style={panelStyle}>
              <h2 style={panelTitleStyle}>הזמנות אחרונות</h2>

              {summary.recent_orders?.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ background: "#e9eff9" }}>
                        <th style={thStyle}>קוד הזמנה</th>
                        <th style={thStyle}>אירוע</th>
                        <th style={thStyle}>משתמש</th>
                        <th style={thStyle}>כמות</th>
                        <th style={thStyle}>מחיר</th>
                        <th style={thStyle}>סטטוס</th>
                        <th style={thStyle}>אמצעי תשלום</th>
                        <th style={thStyle}>מקור רכישה</th>
                        <th style={thStyle}>תאריך</th>
                      </tr>
                    </thead>

                    <tbody>
                      {summary.recent_orders.map((item) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>{item.order_code}</td>
                          <td style={tdStyle}>{item.event_name}</td>
                          <td style={tdStyle}>{item.username}</td>
                          <td style={tdStyle}>{item.tickets_count}</td>
                          <td style={tdStyle}>{item.price}</td>
                          <td style={tdStyle}>{item.status_label}</td>
                          <td style={tdStyle}>{formatPaymentMethod(item.payment_method)}</td>
                          <td style={tdStyle}>{item.purchase_source || "-"}</td>
                          <td style={tdStyle}>{item.purchase_date || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: "#6b7280", fontSize: "15px" }}>
                  אין עדיין הזמנות להצגה בתקופה שנבחרה.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const panelStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const filterPanelStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  marginBottom: "24px",
  display: "flex",
  gap: "14px",
  alignItems: "end",
  flexWrap: "wrap",
};

const panelTitleStyle = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#173d7a",
  fontSize: "26px",
};

const smallSectionTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#374151",
  marginBottom: "10px",
};

const labelStyle = {
  display: "block",
  fontSize: "14px",
  fontWeight: "700",
  color: "#374151",
  marginBottom: "6px",
};

const selectStyle = {
  minWidth: "170px",
  height: "44px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  padding: "0 12px",
  fontSize: "16px",
  background: "#ffffff",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "15px",
};

const thStyle = {
  padding: "12px",
  textAlign: "right",
  borderBottom: "1px solid #dbe3f0",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px",
  textAlign: "right",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
};

const buttonBlue = {
  border: "none",
  background: "#173d7a",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
};

const buttonTeal = {
  border: "none",
  background: "#0f8b8d",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
};

const buttonRed = {
  border: "none",
  background: "#b91c1c",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
};

const buttonGreen = {
  border: "none",
  background: "#15803d",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
};

const buttonPurple = {
  border: "none",
  background: "#6d28d9",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
};