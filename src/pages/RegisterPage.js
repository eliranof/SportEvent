import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterPage.css";
import registerBg from "../assets/img/register.jpg";
import { fetchJsonWithFallback } from "../utils/apiRequest";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [isChecking, setIsChecking] = useState(false);

  const [errors, setErrors] = useState({
    fullName: "",
    address: "",
    username: "",
    email: "",
    phone: "",
    form: "",
  });

  const normalizeAddress = (value) => {
    return value.trim().replace(/\s+/g, " ");
  };

  const validateFullName = (value) => {
    const v = value.trim();

    if (!v) {
      return "יש להזין שם מלא.";
    }

    if (v.length < 2) {
      return "השם המלא חייב להכיל לפחות 2 תווים.";
    }

    return "";
  };

  const validateAddress = (value) => {
    const v = normalizeAddress(value);

    if (!v) {
      return "יש להזין כתובת מגורים.";
    }

    const addressPattern =
      /^[\u0590-\u05FFA-Za-z][\u0590-\u05FFA-Za-z\s.'"״׳-]*\s+\d+[A-Za-z\u0590-\u05FF]?(?:[/-]\d+)?\s+[\u0590-\u05FFA-Za-z][\u0590-\u05FFA-Za-z\s.'"״׳-]*$/;

    if (!addressPattern.test(v)) {
      return "כתובת המגורים חייבת להיות במבנה: שם רחוב + מספר + עיר. לדוגמה: רחוב הרצל 55  ירושלים.";
    }

    return "";
  };

  const validateUsername = (value) => {
    const v = value.trim();

    if (!v) {
      return "יש להזין שם משתמש.";
    }

    if (!/^[A-Za-z0-9]+$/.test(v)) {
      return "שם המשתמש חייב להכיל אותיות באנגלית ומספרים בלבד.";
    }

    if (v.length < 6 || v.length > 12) {
      return "שם המשתמש חייב להיות בין 6 ל-12 תווים.";
    }

    if (!/[0-9]/.test(v)) {
      return "שם המשתמש חייב להכיל לפחות מספר אחד.";
    }

    return "";
  };

  const validateEmail = (value) => {
    const v = value.trim();

    if (!v) {
      return "יש להזין אימייל.";
    }

    const basic = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!basic.test(v)) {
      return "האימייל אינו תקין. דוגמה: name@example.com";
    }

    return "";
  };

  const validatePhone = (value) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      return "יש להזין מספר טלפון.";
    }

    if (digits.length !== 10) {
      return "מספר הטלפון חייב להיות 10 ספרות.";
    }

    const prefix = digits.slice(0, 3);

    if (!/^05[0-9]$/.test(prefix)) {
      return "מספר הטלפון חייב להתחיל ב-050 עד 059 בלבד.";
    }

    return "";
  };

  const isFormValid = useMemo(() => {
    return (
      !validateFullName(fullName) &&
      !validateAddress(address) &&
      !validateUsername(username) &&
      !validateEmail(email) &&
      !validatePhone(phone)
    );
  }, [fullName, address, username, email, phone]);

  const onSubmit = async (e) => {
    e.preventDefault();

    const fullNameErr = validateFullName(fullName);
    const addressErr = validateAddress(address);
    const usernameErr = validateUsername(username);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);

    setErrors({
      fullName: fullNameErr,
      address: addressErr,
      username: usernameErr,
      email: emailErr,
      phone: phoneErr,
      form: "",
    });

    if (fullNameErr || addressErr || usernameErr || emailErr || phoneErr) {
      return;
    }

    setIsChecking(true);

    try {
      const { data } = await fetchJsonWithFallback("check_user_exists.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
        }),
      });

      if (!data.success) {
        const serverMessage = data.details
          ? `${data.message}: ${data.details}`
          : data.message || "לא ניתן לבדוק את פרטי ההרשמה כרגע.";

        setErrors((prev) => ({
          ...prev,
          form: serverMessage,
        }));

        setIsChecking(false);
        return;
      }

      const usernameExistsError = data.usernameExists
        ? "שם המשתמש כבר קיים במערכת."
        : "";

      const emailExistsError = data.emailExists
        ? "כתובת האימייל כבר קיימת במערכת."
        : "";

      if (usernameExistsError || emailExistsError) {
        setErrors((prev) => ({
          ...prev,
          username: usernameExistsError,
          email: emailExistsError,
          form: "",
        }));

        setIsChecking(false);
        return;
      }

      const cleanAddress = normalizeAddress(address);

      navigate("/set-password", {
        state: {
          fullName: fullName.trim(),
          address: cleanAddress,
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
      });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: error?.message || "שגיאה בחיבור לשרת.",
      }));
    } finally {
      setIsChecking(false);
    }
  };

  const handleBlur = (field) => {
    if (field === "fullName") {
      setErrors((prev) => ({
        ...prev,
        fullName: validateFullName(fullName),
      }));
    }

    if (field === "address") {
      setErrors((prev) => ({
        ...prev,
        address: validateAddress(address),
      }));
    }

    if (field === "username") {
      setErrors((prev) => ({
        ...prev,
        username: validateUsername(username),
      }));
    }

    if (field === "email") {
      setErrors((prev) => ({
        ...prev,
        email: validateEmail(email),
      }));
    }

    if (field === "phone") {
      setErrors((prev) => ({
        ...prev,
        phone: validatePhone(phone),
      }));
    }
  };

  return (
    <div
      className="register"
      style={{ backgroundImage: `url(${registerBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="register__overlay" />

      <div className="register__card" role="region" aria-label="טופס הרשמה">
        <div className="register__header">
          <h1 className="register__title">הרשמה לאתר</h1>
          <p className="register__subtitle">מלא את הפרטים ליצירת משתמש חדש</p>
        </div>

        <form
          className="register__form register__form--grid"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="register__field">
            <label className="register__label" htmlFor="fullName">
              שם מלא
            </label>

            <input
              id="fullName"
              className={`register__input ${
                errors.fullName ? "register__input--error" : ""
              }`}
              type="text"
              placeholder="הזן שם מלא"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  fullName: "",
                  form: "",
                }));
              }}
              onBlur={() => handleBlur("fullName")}
              autoComplete="name"
            />

            {errors.fullName && (
              <div className="register__error">{errors.fullName}</div>
            )}
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="address">
              כתובת מגורים
            </label>

            <input
              id="address"
              className={`register__input ${
                errors.address ? "register__input--error" : ""
              }`}
              type="text"
              placeholder="לדוגמה: הרב ריינס 25 נתניה"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  address: "",
                  form: "",
                }));
              }}
              onBlur={() => handleBlur("address")}
              autoComplete="street-address"
            />

            {errors.address && (
              <div className="register__error">{errors.address}</div>
            )}
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="username">
              שם משתמש
            </label>

            <input
              id="username"
              className={`register__input ${
                errors.username ? "register__input--error" : ""
              }`}
              type="text"
              placeholder="6-12 תווים, אותיות באנגלית ולפחות מספר אחד"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.slice(0, 12));
                setErrors((prev) => ({
                  ...prev,
                  username: "",
                  form: "",
                }));
              }}
              onBlur={() => handleBlur("username")}
              autoComplete="username"
              maxLength={12}
            />

            {errors.username && (
              <div className="register__error">{errors.username}</div>
            )}
          </div>

          <div className="register__field">
            <label className="register__label" htmlFor="email">
              Email
            </label>

            <input
              id="email"
              className={`register__input ${
                errors.email ? "register__input--error" : ""
              }`}
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  email: "",
                  form: "",
                }));
              }}
              onBlur={() => handleBlur("email")}
              autoComplete="email"
            />

            {errors.email && (
              <div className="register__error">{errors.email}</div>
            )}
          </div>

          <div className="register__field register__field--full">
            <label className="register__label" htmlFor="phone">
              מספר טלפון
            </label>

            <input
              id="phone"
              className={`register__input ${
                errors.phone ? "register__input--error" : ""
              }`}
              type="tel"
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);

                setPhone(digits);

                setErrors((prev) => ({
                  ...prev,
                  phone: "",
                  form: "",
                }));
              }}
              onBlur={() => handleBlur("phone")}
              autoComplete="tel"
              inputMode="numeric"
            />

            {errors.phone && (
              <div className="register__error">{errors.phone}</div>
            )}
          </div>

          {errors.form && (
            <div className="register__error register__error--full">
              {errors.form}
            </div>
          )}

          <button
            className="register__btn register__btn--full"
            type="submit"
            disabled={!isFormValid || isChecking}
          >
            {isChecking ? "בודק נתונים..." : "צור משתמש"}
          </button>

          <div className="register__footer register__footer--full">
            <Link className="register__footerLink" to="/">
              חזרה לדף הבית
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}