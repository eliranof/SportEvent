import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./PasswordRecoveryPage.css";
import loginBg from "../assets/img/login.jpg";

function validatePassword(passwordValue) {
  if (passwordValue.length < 8) {
    return "הסיסמה חייבת להכיל לפחות 8 תווים.";
  }

  if (!/[A-Z]/.test(passwordValue)) {
    return "הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית.";
  }

  if (!/[0-9]/.test(passwordValue)) {
    return "הסיסמה חייבת להכיל לפחות מספר אחד.";
  }

  if (!/[!@#$%^&*]/.test(passwordValue)) {
    return "הסיסמה חייבת להכיל לפחות תו מיוחד אחד: ! @ # $ % ^ & *";
  }

  return "";
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setError("");
    setInfo("");

    const cleanEmail = email.trim();
    const cleanTemporaryPassword = temporaryPassword.trim();

    if (!cleanEmail || !cleanTemporaryPassword || !newPassword || !confirmNewPassword) {
      setError("יש למלא אימייל, סיסמה זמנית, סיסמה חדשה ואימות סיסמה.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("כתובת האימייל אינה תקינה.");
      return;
    }

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1/sportevent-api/reset_password_confirm.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
            temporaryPassword: cleanTemporaryPassword,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "לא ניתן לעדכן סיסמה.");
        return;
      }

      setInfo("הסיסמה עודכנה בהצלחה. כעת ניתן להתחבר עם הסיסמה החדשה.");

      setTimeout(() => {
        navigate("/login");
      }, 1400);
    } catch (err) {
      setError("שגיאה בחיבור לשרת.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="recovery"
      style={{ backgroundImage: `url(${loginBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="recovery__overlay" />

      <header className="recovery__topbar">
        <button
          type="button"
          className="recovery__topBtn"
          onClick={() => navigate("/forgot-password")}
        >
          חזרה לשכחתי סיסמה
        </button>

        <h1 className="recovery__topTitle">בחירת סיסמה קבועה</h1>

        <button
          type="button"
          className="recovery__topBtn"
          onClick={() => navigate("/")}
        >
          חזרה לדף הבית
        </button>
      </header>

      <main className="recovery__card">
        <h2 className="recovery__title">איפוס סיסמה</h2>

        <p className="recovery__subtitle">
          הזן את הסיסמה הזמנית שקיבלת ולאחר מכן בחר סיסמה קבועה חדשה.
        </p>

        <form className="recovery__form" onSubmit={handleResetPassword}>
          <label className="recovery__label" htmlFor="email">
            אימייל
          </label>

          <input
            id="email"
            className="recovery__input"
            type="email"
            placeholder="name@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
              setInfo("");
            }}
          />

          <label className="recovery__label" htmlFor="temporaryPassword">
            סיסמה זמנית
          </label>

          <input
            id="temporaryPassword"
            className="recovery__input"
            type={showTemporaryPassword ? "text" : "password"}
            placeholder="הקלד את הסיסמה הזמנית"
            value={temporaryPassword}
            onChange={(e) => {
              setTemporaryPassword(e.target.value);
              setError("");
              setInfo("");
            }}
          />

          <button
            type="button"
            className="recovery__showBtn"
            onClick={() => setShowTemporaryPassword(!showTemporaryPassword)}
          >
            {showTemporaryPassword ? "הסתר סיסמה זמנית" : "הצג סיסמה זמנית"}
          </button>

          <label className="recovery__label" htmlFor="newPassword">
            סיסמה קבועה חדשה
          </label>

          <input
            id="newPassword"
            className="recovery__input"
            type={showNewPassword ? "text" : "password"}
            placeholder="לדוגמה: Aa123456!"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError("");
              setInfo("");
            }}
          />

          <button
            type="button"
            className="recovery__showBtn"
            onClick={() => setShowNewPassword(!showNewPassword)}
          >
            {showNewPassword ? "הסתר סיסמה חדשה" : "הצג סיסמה חדשה"}
          </button>

          <div className="recovery__hint">
            הסיסמה חייבת לכלול לפחות 8 תווים, אות גדולה באנגלית, מספר ותו מיוחד.
          </div>

          <label className="recovery__label" htmlFor="confirmNewPassword">
            אימות סיסמה קבועה
          </label>

          <input
            id="confirmNewPassword"
            className="recovery__input"
            type={showConfirmNewPassword ? "text" : "password"}
            placeholder="הקלד שוב את הסיסמה החדשה"
            value={confirmNewPassword}
            onChange={(e) => {
              setConfirmNewPassword(e.target.value);
              setError("");
              setInfo("");
            }}
          />

          <button
            type="button"
            className="recovery__showBtn"
            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
          >
            {showConfirmNewPassword ? "הסתר אימות סיסמה" : "הצג אימות סיסמה"}
          </button>

          {error ? (
            <div className="recovery__msg recovery__msg--error">{error}</div>
          ) : null}

          {info ? (
            <div className="recovery__msg recovery__msg--success">{info}</div>
          ) : null}

          <button className="recovery__btn" type="submit" disabled={loading}>
            {loading ? "מעדכן..." : "עדכן סיסמה"}
          </button>

          <div className="recovery__footer">
            <Link className="recovery__link" to="/login">
              חזרה להתחברות
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}