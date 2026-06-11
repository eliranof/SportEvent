import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAdminUser, getAdminUser } from "../services/adminAuthService";
import useResponsive from "../hooks/useResponsive";

const API_CANDIDATES = [
  "http://127.0.0.1/sportevent-api",
  "http://localhost/sportevent-api",
];

const DEFAULT_PRICING_ROWS = [
  { stand_code: "VIP", display_name: "VIP", price_amount: 520, price_label: "520 ₪" },
  { stand_code: "W", display_name: "מערבי", price_amount: 420, price_label: "420 ₪" },
  { stand_code: "E", display_name: "מזרחי", price_amount: 340, price_label: "340 ₪" },
  { stand_code: "F", display_name: "משפחות", price_amount: 260, price_label: "260 ₪" },
];

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

function buildDefaultRows() {
  return DEFAULT_PRICING_ROWS.map((row) => ({ ...row }));
}

function normalizeEventOptions(items) {
  const map = new Map();

  (items || []).forEach((item) => {
    const eventId = String(item.event_id || "").trim();
    if (!eventId) {
      return;
    }

    if (!map.has(eventId)) {
      map.set(eventId, {
        event_id: eventId,
        title: item.title || item.event_id,
        bucket_key: item.bucket_key || "",
      });
    }
  });

  return Array.from(map.values());
}

export default function AdminPricingInventoryPage() {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const adminUser = getAdminUser();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [pricingRows, setPricingRows] = useState(buildDefaultRows());
  const [inventoryRows, setInventoryRows] = useState([]);
  const [inventoryCounts, setInventoryCounts] = useState({});
  const [seatForm, setSeatForm] = useState({
    stand_code: "VIP",
    row_number: 1,
    seat_number: 1,
    status: "sold",
  });
  const [loading, setLoading] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingSeat, setSavingSeat] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedEvent = useMemo(() => {
    return events.find((item) => item.event_id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const loadEvents = async () => {
    const data = await apiRequest("admin_list_events.php");
    const normalized = normalizeEventOptions(data.items || []);
    setEvents(normalized);

    if (!selectedEventId && normalized.length > 0) {
      setSelectedEventId(normalized[0].event_id);
    }
  };

  const loadEventData = async (eventId) => {
    if (!eventId) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const data = await apiRequest(
        `admin_get_event_pricing_inventory.php?event_id=${encodeURIComponent(eventId)}`
      );

      const rows =
        Array.isArray(data.pricing_rows) && data.pricing_rows.length > 0
          ? data.pricing_rows.map((row) => ({
              stand_code: row.stand_code || "",
              display_name: row.display_name || "",
              price_amount: Number(row.price_amount || 0),
              price_label: row.price_label || "",
            }))
          : buildDefaultRows();

      setPricingRows(rows);
      setInventoryRows(Array.isArray(data.inventory_rows) ? data.inventory_rows : []);
      setInventoryCounts(data.inventory_counts || {});
    } catch (error) {
      setErrorMessage(error.message || "טעינת נתוני האירוע נכשלה");
      setPricingRows(buildDefaultRows());
      setInventoryRows([]);
      setInventoryCounts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventData(selectedEventId);
    }
  }, [selectedEventId]);

  const handlePricingChange = (index, field, value) => {
    setPricingRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
              price_label:
                field === "price_amount"
                  ? `${Number(value || 0)} ₪`
                  : row.price_label,
            }
          : row
      )
    );
  };

  const handleSavePricing = async () => {
    if (!selectedEventId) {
      setErrorMessage("בחר אירוע");
      return;
    }

    setSavingPricing(true);
    setErrorMessage("");
    setMessage("");

    try {
      const payload = {
        event_id: selectedEventId,
        pricing_rows: pricingRows.map((row) => ({
          stand_code: row.stand_code,
          display_name: row.display_name,
          price_amount: Number(row.price_amount || 0),
          price_label: `${Number(row.price_amount || 0)} ₪`,
        })),
      };

      const data = await apiRequest("admin_save_event_pricing.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setMessage(data.message || "התמחור נשמר בהצלחה");
      await loadEventData(selectedEventId);
    } catch (error) {
      setErrorMessage(error.message || "שמירת תמחור נכשלה");
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSeatChange = (field, value) => {
    setSeatForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSeat = async () => {
    if (!selectedEventId) {
      setErrorMessage("בחר אירוע");
      return;
    }

    setSavingSeat(true);
    setErrorMessage("");
    setMessage("");

    try {
      const data = await apiRequest("admin_update_seat_inventory.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: selectedEventId,
          stand_code: seatForm.stand_code,
          row_number: Number(seatForm.row_number),
          seat_number: Number(seatForm.seat_number),
          status: seatForm.status,
        }),
      });

      setMessage(data.message || "המושב עודכן בהצלחה");
      setInventoryRows(Array.isArray(data.inventory_rows) ? data.inventory_rows : []);
      setInventoryCounts(data.inventory_counts || {});
    } catch (error) {
      setErrorMessage(error.message || "עדכון מושב נכשל");
    } finally {
      setSavingSeat(false);
    }
  };

  const handleLogout = () => {
    clearAdminUser();
    navigate("/admin/login");
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
            <h1 style={{ margin: 0, fontSize: "34px", color: "#0b2a5b" }}>
              ניהול מחירים ומלאי מושבים
            </h1>
            <div style={{ marginTop: "6px", color: "#374151", fontSize: "16px" }}>
              מחובר כ: {adminUser?.full_name || adminUser?.username || "מנהל"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate("/admin/dashboard")} style={buttonBlue}>
              דשבורד
            </button>
            <button type="button" onClick={() => navigate("/admin/events")} style={buttonTeal}>
              ניהול אירועים
            </button>
            <button type="button" onClick={handleLogout} style={buttonRed}>
              התנתקות
            </button>
          </div>
        </div>

        {message ? (
          <div style={successBoxStyle}>{message}</div>
        ) : null}

        {errorMessage ? (
          <div style={errorBoxStyle}>{errorMessage}</div>
        ) : null}

        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>בחירת אירוע</h2>

          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={inputStyle}
          >
            <option value="">בחר אירוע</option>
            {events.map((eventItem) => (
              <option key={eventItem.event_id} value={eventItem.event_id}>
                {eventItem.title} ({eventItem.event_id})
              </option>
            ))}
          </select>

          {selectedEvent ? (
            <div style={{ marginTop: "12px", color: "#374151", fontSize: "16px" }}>
              קטגוריה: {selectedEvent.bucket_key}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr",
            gap: "18px",
            marginTop: "20px",
          }}
        >
          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>מחירים דינמיים לפי יציע</h2>

            {loading ? (
              <div style={{ fontSize: "18px", fontWeight: "700" }}>טוען נתונים...</div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {pricingRows.map((row, index) => (
                    <div key={`${row.stand_code}-${index}`} style={miniCardStyle}>
                      <div style={{ fontWeight: "700", marginBottom: "8px", color: "#173d7a" }}>
                        יציע {row.display_name || row.stand_code}
                      </div>

                      <label style={labelStyle}>
                        קוד יציע
                        <input
                          value={row.stand_code}
                          onChange={(e) =>
                            handlePricingChange(index, "stand_code", e.target.value)
                          }
                          style={inputStyle}
                        />
                      </label>

                      <label style={labelStyle}>
                        שם תצוגה
                        <input
                          value={row.display_name}
                          onChange={(e) =>
                            handlePricingChange(index, "display_name", e.target.value)
                          }
                          style={inputStyle}
                        />
                      </label>

                      <label style={labelStyle}>
                        מחיר
                        <input
                          type="number"
                          value={row.price_amount}
                          onChange={(e) =>
                            handlePricingChange(index, "price_amount", e.target.value)
                          }
                          style={inputStyle}
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSavePricing}
                  disabled={savingPricing || !selectedEventId}
                  style={{ ...buttonGreen, marginTop: "18px" }}
                >
                  {savingPricing ? "שומר..." : "שמור תמחור"}
                </button>
              </>
            )}
          </div>

          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>עדכון ידני של מושב</h2>

            <label style={labelStyle}>
              יציע
              <select
                value={seatForm.stand_code}
                onChange={(e) => handleSeatChange("stand_code", e.target.value)}
                style={inputStyle}
              >
                <option value="VIP">VIP</option>
                <option value="W">W</option>
                <option value="E">E</option>
                <option value="F">F</option>
              </select>
            </label>

            <label style={labelStyle}>
              שורה
              <input
                type="number"
                value={seatForm.row_number}
                onChange={(e) => handleSeatChange("row_number", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              מושב
              <input
                type="number"
                value={seatForm.seat_number}
                onChange={(e) => handleSeatChange("seat_number", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              סטטוס
              <select
                value={seatForm.status}
                onChange={(e) => handleSeatChange("status", e.target.value)}
                style={inputStyle}
              >
                <option value="sold">מכור</option>
                <option value="available">זמין</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handleSaveSeat}
              disabled={savingSeat || !selectedEventId}
              style={{ ...buttonGreen, marginTop: "10px" }}
            >
              {savingSeat ? "מעדכן..." : "עדכן מושב"}
            </button>

            <div style={{ marginTop: "18px" }}>
              <div style={{ fontWeight: "700", marginBottom: "10px", color: "#173d7a" }}>
                ספירת סטטוסים
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {Object.keys(inventoryCounts).length > 0 ? (
                  Object.entries(inventoryCounts).map(([key, value]) => (
                    <div key={key} style={chipStyle}>
                      {key}: {value}
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#6b7280" }}>אין עדיין נתוני מלאי</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...panelStyle, marginTop: "20px" }}>
          <h2 style={panelTitleStyle}>מלאי מושבים שנשמר בשרת</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#e9eff9" }}>
                  <th style={thStyle}>seat_key</th>
                  <th style={thStyle}>סטטוס</th>
                  <th style={thStyle}>יציע</th>
                  <th style={thStyle}>שורה</th>
                  <th style={thStyle}>מושב</th>
                  <th style={thStyle}>פעולה אחרונה</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.length ? (
                  inventoryRows.map((row) => (
                    <tr key={`${row.seat_key}-${row.status}`}>
                      <td style={tdStyle}>{row.seat_key}</td>
                      <td style={tdStyle}>{row.status}</td>
                      <td style={tdStyle}>{row.stand_code || "-"}</td>
                      <td style={tdStyle}>{row.row_number || "-"}</td>
                      <td style={tdStyle}>{row.seat_number || "-"}</td>
                      <td style={tdStyle}>{row.last_action || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={tdStyle} colSpan={6}>
                      אין עדיין רשומות מלאי לאירוע זה
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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

const miniCardStyle = {
  background: "#f8fbff",
  border: "1px solid #dbe8ff",
  borderRadius: "14px",
  padding: "14px",
};

const panelTitleStyle = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#173d7a",
  fontSize: "26px",
};

const labelStyle = {
  display: "block",
  fontWeight: "700",
  marginBottom: "10px",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid #cfd6e4",
  padding: "12px",
  fontSize: "15px",
  boxSizing: "border-box",
  background: "#fff",
  marginTop: "6px",
};

const successBoxStyle = {
  background: "#e8fff0",
  color: "#17633d",
  padding: "14px 16px",
  borderRadius: "10px",
  marginBottom: "16px",
  fontSize: "16px",
  fontWeight: "700",
};

const errorBoxStyle = {
  background: "#ffe8e8",
  color: "#9b1d1d",
  padding: "14px 16px",
  borderRadius: "10px",
  marginBottom: "16px",
  fontSize: "16px",
  fontWeight: "700",
};

const chipStyle = {
  background: "#eef4ff",
  color: "#173d7a",
  borderRadius: "999px",
  padding: "8px 14px",
  fontSize: "14px",
  fontWeight: "700",
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
  background: "#1a7f37",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "700",
};