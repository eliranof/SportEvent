import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearAdminUser,
  clearPendingAdmin2FA,
  getPendingAdmin2FA,
  verifyAdmin2FA,
} from "../services/adminAuthService";

export default function AdminVerify2FAPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(getPendingAdmin2FA());

  useEffect(() => {
    const pendingData = getPendingAdmin2FA();

    if (!pendingData?.challenge_id) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setPending(pendingData);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const pendingData = getPendingAdmin2FA();
      const nextPath = pendingData?.nextPath || "/admin/dashboard";

      await verifyAdmin2FA(code);
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "אימות הקוד נכשל");
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    clearAdminUser();
    clearPendingAdmin2FA();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0b1f4d 0%, #173d7a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "30px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "10px",
            fontSize: "34px",
            color: "#0b2a5b",
            textAlign: "center",
          }}
        >
          אימות דו-שלבי
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#4b5563",
            fontSize: "17px",
            marginBottom: "20px",
          }}
        >
          שלב שני: הזן את קוד האימות החד פעמי
        </p>

        {pending?.admin_preview ? (
          <div
            style={{
              background: "#eef4ff",
              color: "#173d7a",
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontWeight: "700",
            }}
          >
            מנהל: {pending.admin_preview.full_name || pending.admin_preview.username}
          </div>
        ) : null}

        {pending?.dev_code ? (
          <div
            style={{
              background: "#fff7df",
              color: "#8a5a00",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontWeight: "700",
              fontSize: "16px",
            }}
          >
            קוד בדיקה מקומי: {pending.dev_code}
            <div style={{ marginTop: "6px", fontWeight: "400", fontSize: "14px" }}>
              בשלב מאוחר יותר אפשר להחליף את זה לשליחה אמיתית במייל.
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            style={{
              background: "#ffe8e8",
              color: "#9b1d1d",
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontWeight: "700",
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "6px" }}>
              קוד אימות
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={inputStyle}
              placeholder="הכנס 6 ספרות"
              maxLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              border: "none",
              background: "#173d7a",
              color: "#fff",
              padding: "14px 18px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "700",
            }}
          >
            {saving ? "מאמת..." : "אמת והיכנס"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleRestart}
          style={{
            width: "100%",
            marginTop: "12px",
            border: "none",
            background: "#6b7280",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "700",
          }}
        >
          חזרה לכניסה מחדש
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid #cfd6e4",
  padding: "12px",
  fontSize: "16px",
  boxSizing: "border-box",
  background: "#fff",
  textAlign: "center",
  letterSpacing: "4px",
};