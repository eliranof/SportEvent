import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAdminUser, getAdminUser } from "../services/adminAuthService";
import useResponsive from "../hooks/useResponsive";

const API_CANDIDATES = [
  "http://127.0.0.1/sportevent-api",
  "http://localhost/sportevent-api",
];

const EMPTY_FORM = {
  row_id: 0,
  event_id: "",
  bucket_key: "near",
  section_title: "",
  title: "",
  teams: "",
  competition: "",
  category: "",
  location: "",
  date_time: "",
  price: "",
  sort_order: 0,
  badge: "",
  subtitle: "",
  round: "",
  payload_json: "",
};

const BUCKET_OPTIONS = [
  { value: "near", label: "אירועים קרובים" },
  { value: "sold_out", label: "Sold Out" },
  { value: "israel", label: "אירועים בארץ" },
  { value: "world", label: "אירועים בעולם" },
  { value: "featured", label: "אירועים שאסור לפספס" },
  { value: "tennis_must_see", label: "טניס" },
  { value: "final_four", label: "פיינל פור" },
  { value: "world_cup", label: "מונדיאל" },
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

function tryFormatJson(value) {
  if (!value || !String(value).trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return value;
  }
}

export default function AdminEventsPage() {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const adminUser = getAdminUser();

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      return [
        item.event_id,
        item.bucket_key,
        item.title,
        item.section_title,
        item.competition,
        item.category,
        item.location,
        item.date_time,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, search]);

  const loadItems = async () => {
    setLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const data = await apiRequest("admin_list_events.php");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setErrorMessage(error.message || "טעינת האירועים נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEdit = (item) => {
    setErrorMessage("");
    setMessage("");

    setForm({
      row_id: item.row_id || 0,
      event_id: item.event_id || "",
      bucket_key: item.bucket_key || "near",
      section_title: item.section_title || "",
      title: item.title || "",
      teams: "",
      competition: item.competition || "",
      category: item.category || "",
      location: item.location || "",
      date_time: item.date_time || "",
      price: item.price || "",
      sort_order: item.sort_order || 0,
      badge: "",
      subtitle: "",
      round: "",
      payload_json: tryFormatJson(item.payload_json || ""),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setMessage("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      if (form.payload_json && form.payload_json.trim()) {
        JSON.parse(form.payload_json);
      }

      const payload = {
        ...form,
        sort_order: Number(form.sort_order || 0),
      };

      const data = await apiRequest("admin_save_event.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      localStorage.removeItem("sportevent_events_cache_v1");
      setMessage(data.message || "האירוע נשמר בהצלחה");
      handleReset();
      await loadItems();
    } catch (error) {
      setErrorMessage(error.message || "שמירת האירוע נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rowId) => {
    const confirmed = window.confirm("למחוק את האירוע?");
    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    try {
      const data = await apiRequest("admin_delete_event.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ row_id: rowId }),
      });

      localStorage.removeItem("sportevent_events_cache_v1");
      setMessage(data.message || "האירוע נמחק בהצלחה");
      await loadItems();
    } catch (error) {
      setErrorMessage(error.message || "מחיקת האירוע נכשלה");
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
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
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
              ניהול אירועים
            </h1>
            <div style={{ marginTop: "6px", color: "#374151", fontSize: "16px" }}>
              מחובר כ: {adminUser?.full_name || adminUser?.username || "מנהל"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              style={{
                border: "none",
                background: "#0f8b8d",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              מעבר לדשבורד
            </button>

            <button
              type="button"
              onClick={loadItems}
              style={{
                border: "none",
                background: "#173d7a",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              רענון רשימה
            </button>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: "none",
                background: "#b91c1c",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              התנתקות
            </button>
          </div>
        </div>

        {message ? (
          <div
            style={{
              background: "#e8fff0",
              color: "#17633d",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontSize: "16px",
              fontWeight: "700",
            }}
          >
            {message}
          </div>
        ) : null}

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

        <form
          onSubmit={handleSave}
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#173d7a", fontSize: "26px" }}>
            {form.row_id ? "עריכת אירוע" : "יצירת אירוע חדש"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>event_id</div>
              <input
                value={form.event_id}
                onChange={(e) => handleChange("event_id", e.target.value)}
                style={inputStyle}
                required
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>קטגוריה</div>
              <select
                value={form.bucket_key}
                onChange={(e) => handleChange("bucket_key", e.target.value)}
                style={inputStyle}
              >
                {BUCKET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>section_title</div>
              <input
                value={form.section_title}
                onChange={(e) => handleChange("section_title", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>title</div>
              <input
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>teams</div>
              <input
                value={form.teams}
                onChange={(e) => handleChange("teams", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>competition</div>
              <input
                value={form.competition}
                onChange={(e) => handleChange("competition", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>category</div>
              <input
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>location</div>
              <input
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>date_time</div>
              <input
                value={form.date_time}
                onChange={(e) => handleChange("date_time", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>price</div>
              <input
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>sort_order</div>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => handleChange("sort_order", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>badge</div>
              <input
                value={form.badge}
                onChange={(e) => handleChange("badge", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>subtitle</div>
              <input
                value={form.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label>
              <div style={{ marginBottom: "6px", fontWeight: "700" }}>round</div>
              <input
                value={form.round}
                onChange={(e) => handleChange("round", e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginTop: "16px" }}>
            <div style={{ marginBottom: "6px", fontWeight: "700" }}>
              payload_json מתקדם
            </div>
            <textarea
              value={form.payload_json}
              onChange={(e) => handleChange("payload_json", e.target.value)}
              style={{
                width: "100%",
                minHeight: "220px",
                borderRadius: "10px",
                border: "1px solid #cfd6e4",
                padding: "12px",
                fontSize: "14px",
                fontFamily: "Consolas, monospace",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              placeholder="אפשר להשאיר ריק. אפשר גם להדביק JSON מלא של האירוע"
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "18px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                border: "none",
                background: "#1a7f37",
                color: "#fff",
                padding: "12px 22px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "700",
              }}
            >
              {saving ? "שומר..." : form.row_id ? "שמור שינויים" : "צור אירוע"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                border: "none",
                background: "#6b7280",
                color: "#fff",
                padding: "12px 22px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "700",
              }}
            >
              איפוס טופס
            </button>
          </div>
        </form>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0, color: "#173d7a", fontSize: "26px" }}>
              רשימת אירועים
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי כותרת, קטגוריה, מיקום, event_id..."
              style={{
                width: "360px",
                maxWidth: "100%",
                ...inputStyle,
              }}
            />
          </div>

          {loading ? (
            <div style={{ fontSize: "18px", fontWeight: "700" }}>טוען אירועים...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "15px",
                }}
              >
                <thead>
                  <tr style={{ background: "#e9eff9" }}>
                    <th style={thStyle}>id</th>
                    <th style={thStyle}>event_id</th>
                    <th style={thStyle}>bucket</th>
                    <th style={thStyle}>title</th>
                    <th style={thStyle}>section</th>
                    <th style={thStyle}>competition</th>
                    <th style={thStyle}>location</th>
                    <th style={thStyle}>date</th>
                    <th style={thStyle}>price</th>
                    <th style={thStyle}>order</th>
                    <th style={thStyle}>status</th>
                    <th style={thStyle}>פעולות</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.row_id}>
                      <td style={tdStyle}>{item.row_id}</td>
                      <td style={tdStyle}>{item.event_id}</td>
                      <td style={tdStyle}>{item.bucket_key}</td>
                      <td style={tdStyle}>{item.title}</td>
                      <td style={tdStyle}>{item.section_title}</td>
                      <td style={tdStyle}>{item.competition}</td>
                      <td style={tdStyle}>{item.location}</td>
                      <td style={tdStyle}>{item.date_time}</td>
                      <td style={tdStyle}>{item.price}</td>
                      <td style={tdStyle}>{item.sort_order}</td>
                      <td style={tdStyle}>
                        {Number(item.is_active) === 1 ? "פעיל" : "מוסתר"}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            style={editBtnStyle}
                          >
                            עריכה
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.row_id)}
                            style={deleteBtnStyle}
                          >
                            מחיקה
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filteredItems.length ? (
                    <tr>
                      <td style={tdStyle} colSpan={12}>
                        לא נמצאו אירועים
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid #cfd6e4",
  padding: "12px",
  fontSize: "15px",
  boxSizing: "border-box",
  background: "#fff",
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

const editBtnStyle = {
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
};

const deleteBtnStyle = {
  border: "none",
  background: "#b91c1c",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
};