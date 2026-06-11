import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import registerBg from "../assets/img/register.jpg";
import { fetchJsonWithFallback } from "../utils/apiRequest";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getMergedUser() {
  const localUser = safeParse(localStorage.getItem("user"));
  const sessionUser = safeParse(sessionStorage.getItem("user"));
  const extras = safeParse(localStorage.getItem("sporteventProfileExtras"));
  const lastRegistered = safeParse(
    localStorage.getItem("sporteventLastRegisteredProfile")
  );

  const user = localUser || sessionUser || {};

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

export default function EditProfilePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    id: "",
    username: "",
    fullName: "",
    address: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState({
    username: "",
    fullName: "",
    address: "",
    email: "",
    phone: "",
  });

  const [serverError, setServerError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");

    if (!savedUser) {
      navigate("/login");
      return;
    }

    const mergedUser = getMergedUser();

    setForm({
      id: mergedUser.id || "",
      username: mergedUser.username || "",
      fullName: mergedUser.fullName || "",
      address: mergedUser.address || "",
      email: mergedUser.email || "",
      phone: mergedUser.phone || "",
    });
  }, [navigate]);

  const validateUsername = (value) => {
    const v = value.trim();

    if (!v) return "יש להזין שם משתמש.";
    if (!/^[A-Za-z0-9]{8,12}$/.test(v)) {
      return "שם המשתמש חייב להכיל 8 עד 12 תווים, אותיות באנגלית ומספרים בלבד.";
    }

    return "";
  };

  const validateFullName = (value) => {
    const v = value.trim();

    if (!v) return "יש להזין שם מלא.";
    if (v.length < 2) return "השם המלא חייב להכיל לפחות 2 תווים.";

    return "";
  };

  const validateAddress = (value) => {
    const v = value.trim();

    if (!v) return "יש להזין כתובת מגורים.";
    if (v.length < 5) return "כתובת המגורים חייבת להכיל לפחות 5 תווים.";

    return "";
  };

  const validateEmail = (value) => {
    const v = value.trim();

    if (!v) return 'יש להזין דוא"ל.';

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(v)) {
      return 'יש להזין דוא"ל תקין עם @ וסיומת.';
    }

    return "";
  };

  const validatePhone = (value) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) return "יש להזין מספר טלפון.";
    if (digits.length !== 10) return "מספר הטלפון חייב להכיל 10 ספרות.";
    if (!/^05[0-9]{8}$/.test(digits)) {
      return "מספר הטלפון חייב להיות מספר ישראלי שמתחיל ב-05.";
    }

    return "";
  };

  const isFormValid = useMemo(() => {
    return (
      !validateUsername(form.username) &&
      !validateFullName(form.fullName) &&
      !validateAddress(form.address) &&
      !validateEmail(form.email) &&
      !validatePhone(form.phone)
    );
  }, [form.username, form.fullName, form.address, form.email, form.phone]);

  const handleChange = (field, value) => {
    let newValue = value;

    if (field === "username") {
      newValue = value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
    }

    if (field === "phone") {
      newValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setForm((prev) => ({
      ...prev,
      [field]: newValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));

    setServerError("");
    setMessage("");
  };

  const handleBlur = (field) => {
    if (field === "username") {
      setErrors((prev) => ({
        ...prev,
        username: validateUsername(form.username),
      }));
    }

    if (field === "fullName") {
      setErrors((prev) => ({
        ...prev,
        fullName: validateFullName(form.fullName),
      }));
    }

    if (field === "address") {
      setErrors((prev) => ({
        ...prev,
        address: validateAddress(form.address),
      }));
    }

    if (field === "email") {
      setErrors((prev) => ({
        ...prev,
        email: validateEmail(form.email),
      }));
    }

    if (field === "phone") {
      setErrors((prev) => ({
        ...prev,
        phone: validatePhone(form.phone),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setMessage("");

    const usernameErr = validateUsername(form.username);
    const fullNameErr = validateFullName(form.fullName);
    const addressErr = validateAddress(form.address);
    const emailErr = validateEmail(form.email);
    const phoneErr = validatePhone(form.phone);

    setErrors({
      username: usernameErr,
      fullName: fullNameErr,
      address: addressErr,
      email: emailErr,
      phone: phoneErr,
    });

    if (usernameErr || fullNameErr || addressErr || emailErr || phoneErr) {
      return;
    }

    try {
      const { data } = await fetchJsonWithFallback("update_profile.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: form.id,
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          address: form.address.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });

      if (data.success) {
        const updatedUser = {
          id: data.user?.id || form.id,
          username: data.user?.username || form.username.trim(),
          fullName:
            data.user?.fullName ||
            data.user?.full_name ||
            form.fullName.trim(),
          address: data.user?.address || form.address.trim(),
          email: data.user?.email || form.email.trim(),
          phone: data.user?.phone || form.phone.trim(),
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        sessionStorage.setItem("user", JSON.stringify(updatedUser));

        localStorage.setItem(
          "sporteventProfileExtras",
          JSON.stringify({
            fullName: updatedUser.fullName,
            address: updatedUser.address,
            email: updatedUser.email,
            phone: updatedUser.phone,
          })
        );

        setMessage("הפרטים עודכנו בהצלחה.");

        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        setServerError(data.message || "העדכון נכשל.");
      }
    } catch (err) {
      setServerError(err?.message || "שגיאה בחיבור לשרת.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${registerBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
      dir="rtl"
      lang="he"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "24px",
          padding: "32px",
          backdropFilter: "blur(14px)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
          color: "#fff",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginTop: 0,
            marginBottom: "24px",
            fontSize: "40px",
            fontWeight: "800",
          }}
        >
          עריכת פרטים
        </h1>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <label style={labelStyle} htmlFor="fullName">
            שם מלא
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            onBlur={() => handleBlur("fullName")}
            style={{
              ...inputStyle,
              border: errors.fullName
                ? "1px solid #ffb4b4"
                : "1px solid rgba(255,255,255,0.3)",
            }}
            autoComplete="name"
          />
          {errors.fullName && <div style={errorStyle}>{errors.fullName}</div>}

          <label style={labelStyle} htmlFor="address">
            כתובת מגורים
          </label>
          <input
            id="address"
            type="text"
            name="address"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            onBlur={() => handleBlur("address")}
            style={{
              ...inputStyle,
              border: errors.address
                ? "1px solid #ffb4b4"
                : "1px solid rgba(255,255,255,0.3)",
            }}
            autoComplete="street-address"
          />
          {errors.address && <div style={errorStyle}>{errors.address}</div>}

          <label style={labelStyle} htmlFor="username">
            שם משתמש
          </label>
          <input
            id="username"
            type="text"
            name="username"
            value={form.username}
            onChange={(e) => handleChange("username", e.target.value)}
            onBlur={() => handleBlur("username")}
            style={{
              ...inputStyle,
              border: errors.username
                ? "1px solid #ffb4b4"
                : "1px solid rgba(255,255,255,0.3)",
            }}
            autoComplete="username"
            inputMode="text"
            maxLength={12}
          />
          {errors.username && <div style={errorStyle}>{errors.username}</div>}

          <label style={labelStyle} htmlFor="email">
            דוא"ל
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            style={{
              ...inputStyle,
              border: errors.email
                ? "1px solid #ffb4b4"
                : "1px solid rgba(255,255,255,0.3)",
            }}
            autoComplete="email"
          />
          {errors.email && <div style={errorStyle}>{errors.email}</div>}

          <label style={labelStyle} htmlFor="phone">
            טלפון
          </label>
          <input
            id="phone"
            type="text"
            name="phone"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            onBlur={() => handleBlur("phone")}
            style={{
              ...inputStyle,
              border: errors.phone
                ? "1px solid #ffb4b4"
                : "1px solid rgba(255,255,255,0.3)",
            }}
            autoComplete="tel"
            inputMode="numeric"
            placeholder="05XXXXXXXX"
          />
          {errors.phone && <div style={errorStyle}>{errors.phone}</div>}

          {serverError && (
            <div
              style={{
                color: "#ffd1d1",
                fontWeight: "700",
                textAlign: "center",
                fontSize: "20px",
              }}
            >
              {serverError}
            </div>
          )}

          {message && (
            <div
              style={{
                color: "#d1ffe0",
                fontWeight: "700",
                textAlign: "center",
                fontSize: "20px",
              }}
            >
              {message}
            </div>
          )}

          <button type="submit" style={buttonStyle} disabled={!isFormValid}>
            שמירת שינויים
          </button>

          <Link
            to="/"
            style={{
              textAlign: "center",
              marginTop: "10px",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "24px",
            }}
          >
            חזרה לדף הבית
          </Link>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  fontWeight: "800",
  fontSize: "24px",
};

const inputStyle = {
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.3)",
  fontSize: "26px",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle = {
  marginTop: "14px",
  padding: "16px",
  border: "none",
  borderRadius: "12px",
  background: "#2563eb",
  color: "#fff",
  fontSize: "28px",
  fontWeight: "700",
  cursor: "pointer",
};

const errorStyle = {
  color: "#ffd1d1",
  fontWeight: "700",
  fontSize: "20px",
  marginTop: "-4px",
  marginBottom: "2px",
};