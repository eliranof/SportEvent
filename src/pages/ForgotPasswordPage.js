import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PasswordRecoveryPage.css";
import loginBg from "../assets/img/login.jpg";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendTemporaryPassword = async (e) => {
    e.preventDefault();

    setError("");
    setInfo("");
    setTemporaryPassword("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("יש להזין כתובת אימייל.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("כתובת האימייל אינה תקינה.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1/sportevent-api/forgot_password_request.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "לא ניתן לשלוח סיסמה זמנית.");
        return;
      }

      setInfo(data.message || "סיסמה זמנית נוצרה בהצלחה.");
      setTemporaryPassword(data.dev_temp_password || "");
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
          onClick={() => navigate("/login")}
        >
          חזרה להתחברות
        </button>

        <h1 className="recovery__topTitle">שכחתי סיסמה</h1>

        <button
          type="button"
          className="recovery__topBtn"
          onClick={() => navigate("/")}
        >
          חזרה לדף הבית
        </button>
      </header>

      <main className="recovery__card">
        <h2 className="recovery__title">שליחת סיסמה זמנית</h2>

        <p className="recovery__subtitle">
          הזן את כתובת האימייל שאיתה נרשמת לאתר. המערכת תיצור סיסמה זמנית.
        </p>

        <form className="recovery__form" onSubmit={handleSendTemporaryPassword}>
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
              setTemporaryPassword("");
            }}
          />

          {error ? (
            <div className="recovery__msg recovery__msg--error">{error}</div>
          ) : null}

          {info ? (
            <div className="recovery__msg recovery__msg--success">{info}</div>
          ) : null}

          {temporaryPassword ? (
            <div className="recovery__temporaryBox">
              <strong>בדיקה מקומית ב-XAMPP:</strong>
              <span>הסיסמה הזמנית היא: {temporaryPassword}</span>
              <small>
                בפרויקט אמיתי לא מציגים סיסמה במסך. כאן זה רק לצורך בדיקה מקומית.
              </small>
            </div>
          ) : null}

          <button className="recovery__btn" type="submit" disabled={loading}>
            {loading ? "שולח..." : "שלח סיסמה זמנית"}
          </button>

          {info ? (
            <button
              type="button"
              className="recovery__btn recovery__btn--secondary"
              onClick={() =>
                navigate("/reset-password", {
                  state: {
                    email: email.trim(),
                  },
                })
              }
            >
              המשך לבחירת סיסמה קבועה
            </button>
          ) : null}

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