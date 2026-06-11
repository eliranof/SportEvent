import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginAdmin } from "../services/adminAuthService";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const nextPath = location.state?.from?.pathname || "/admin/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      await loginAdmin(username, password, nextPath);
      navigate("/admin/verify-2fa", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "התחברות נכשלה");
    } finally {
      setSaving(false);
    }
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
          maxWidth: "480px",
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
          כניסת מנהל
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#4b5563",
            fontSize: "17px",
            marginBottom: "24px",
          }}
        >
          שלב ראשון: שם משתמש וסיסמה
        </p>

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
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "6px" }}>
              שם משתמש
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              placeholder="הכנס שם משתמש"
              required
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontWeight: "700", marginBottom: "6px" }}>
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="הכנס סיסמה"
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
            {saving ? "בודק..." : "המשך לאימות"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/")}
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
          חזרה לדף הבית
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
};