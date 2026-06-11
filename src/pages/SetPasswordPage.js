import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./SetPasswordPage.css";
import registerBg from "../assets/img/register.jpg";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const userDraft = location.state || null;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const validatePassword = (passwordValue) => {
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!userDraft || !userDraft.username || !userDraft.email || !userDraft.phone) {
      setError("חסרים פרטי הרשמה. חזור לדף ההרשמה.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("יש להזין סיסמה ולאמת סיסמה.");
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות. נסה שוב.");
      return;
    }

    navigate("/verify", {
      state: {
        ...userDraft,
        password,
      },
    });
  };

  return (
    <div
      className="setpass"
      style={{ backgroundImage: `url(${registerBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="setpass__overlay" />

      <div className="setpass__card" role="region" aria-label="בחירת סיסמה">
        <div className="setpass__header">
          <h1 className="setpass__title">בחר סיסמה</h1>
          <p className="setpass__subtitle">
            יש להזין סיסמה חזקה ולאמת אותה
          </p>
        </div>

        <form className="setpass__form" onSubmit={handleSubmit} noValidate>
          <label className="setpass__label" htmlFor="password">
            סיסמה
          </label>

          <input
            id="password"
            className={`setpass__input ${error ? "setpass__input--error" : ""}`}
            type="password"
            placeholder="לדוגמה: Aa123456!"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            autoComplete="new-password"
          />

          <div className="setpass__msg">
            הסיסמה חייבת לכלול לפחות 8 תווים, אות גדולה באנגלית, מספר ותו מיוחד.
            <br />
            דוגמה לסיסמה תקינה: Aa123456!
          </div>

          <label className="setpass__label" htmlFor="confirmPassword">
            אמת סיסמה
          </label>

          <input
            id="confirmPassword"
            className={`setpass__input ${error ? "setpass__input--error" : ""}`}
            type="password"
            placeholder="הקלד שוב את הסיסמה"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            autoComplete="new-password"
          />

          {error && <div className="setpass__error">{error}</div>}

          <button className="setpass__btn" type="submit">
            המשך
          </button>

          <div className="setpass__footer">
            <Link className="setpass__footerLink" to="/">
              חזרה לדף הבית
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}