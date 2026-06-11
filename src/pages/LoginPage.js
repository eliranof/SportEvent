import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import loginBg from "../assets/img/login.jpg";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getRememberedProfile() {
  const sessionUser = safeParse(sessionStorage.getItem("user"));
  const extras = safeParse(localStorage.getItem("sporteventProfileExtras"));
  const lastRegistered = safeParse(
    localStorage.getItem("sporteventLastRegisteredProfile")
  );

  const user = sessionUser || {};

  return {
    id: user.id || "",
    username: user.username || "",
    fullName:
      user.fullName ||
      user.full_name ||
      user.name ||
      extras?.fullName ||
      lastRegistered?.fullName ||
      "",
    address:
      user.address ||
      user.homeAddress ||
      user.home_address ||
      extras?.address ||
      lastRegistered?.address ||
      "",
    email: user.email || extras?.email || lastRegistered?.email || "",
    phone: user.phone || extras?.phone || lastRegistered?.phone || "",
  };
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setInfo("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("יש להזין אימייל וסיסמה.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1/sportevent-api/login.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const remembered = getRememberedProfile();

        const normalizedUser = {
          id: data.user?.id || remembered.id || "",
          username: data.user?.username || remembered.username || "",
          fullName:
            data.user?.fullName ||
            data.user?.full_name ||
            data.user?.name ||
            remembered.fullName ||
            "",
          address:
            data.user?.address ||
            data.user?.homeAddress ||
            data.user?.home_address ||
            remembered.address ||
            "",
          email: data.user?.email || cleanEmail,
          phone: data.user?.phone || remembered.phone || "",
        };

        localStorage.removeItem("user");
        sessionStorage.setItem("user", JSON.stringify(normalizedUser));

        localStorage.setItem(
          "sporteventProfileExtras",
          JSON.stringify({
            fullName: normalizedUser.fullName,
            address: normalizedUser.address,
            email: normalizedUser.email,
            phone: normalizedUser.phone,
          })
        );

        setInfo("התחברת בהצלחה.");

        setTimeout(() => {
          navigate("/");
        }, 800);
      } else {
        setError(data.message || "התחברות נכשלה.");
      }
    } catch (err) {
      setError("שגיאה בחיבור לשרת.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login"
      style={{ backgroundImage: `url(${loginBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="login__overlay" />

      <header className="login__topbar">
        <button
          type="button"
          className="login__topBtn"
          onClick={() => navigate("/")}
        >
          חזרה לדף הבית
        </button>

        <h1 className="login__topTitle">התחברות לאתר</h1>

        <div className="login__topSpacer" />
      </header>

      <div className="login__card" role="region" aria-label="טופס התחברות">
        <div className="login__header">
          <h2 className="login__title">התחברות</h2>

          <p className="login__subtitle">
            התחבר כדי לצפות בהזמנות, באירועים שמורים ובהמלצות אישיות
          </p>
        </div>

        <form className="login__form" onSubmit={handleSubmit} autoComplete="off">
          <label className="login__label" htmlFor="email">
            אימייל
          </label>

          <input
            id="email"
            className="login__input"
            type="email"
            placeholder="name@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
              setInfo("");
            }}
            autoComplete="off"
          />

          <label className="login__label" htmlFor="password">
            סיסמה
          </label>

          <input
            id="password"
            className="login__input"
            type="password"
            placeholder="הקלד סיסמה"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
              setInfo("");
            }}
            autoComplete="new-password"
          />

          <div className="login__forgotRow">
            <button
              type="button"
              className="login__forgotBtn"
              onClick={() => navigate("/forgot-password")}
            >
              שכחתי סיסמה?
            </button>
          </div>

          {error ? (
            <div className="login__msg login__msg--error">{error}</div>
          ) : null}

          {info ? (
            <div className="login__msg login__msg--info">{info}</div>
          ) : null}

          <button className="login__btn" type="submit" disabled={loading}>
            {loading ? "מתחבר..." : "התחבר"}
          </button>

          <div className="login__footer">
            <div className="login__footerRow">
              <span className="login__footerText">עדיין אין לך חשבון?</span>

              <Link className="login__footerLink" to="/register">
                להרשמה
              </Link>
            </div>

            <Link className="login__footerLink login__footerLink--home" to="/">
              חזרה לדף הבית
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}