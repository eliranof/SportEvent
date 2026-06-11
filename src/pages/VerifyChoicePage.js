import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./VerifyChoicePage.css";
import registerBg from "../assets/img/register.jpg";
import { fetchJsonWithFallback } from "../utils/apiRequest";

export default function VerifyChoicePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [method, setMethod] = useState("");
  const [showBox, setShowBox] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDraft = location.state || null;

  const handleChoose = async (selectedMethod) => {
    setMethod(selectedMethod);
    setShowBox(false);
    setCode("");
    setMsg("");
    setError("");
    setSuccess("");
    setDemoCode("");
    setIsSending(true);

    if (
      !userDraft ||
      !userDraft.fullName ||
      !userDraft.address ||
      !userDraft.username ||
      !userDraft.email ||
      !userDraft.phone ||
      !userDraft.password
    ) {
      setError("חסרים פרטי הרשמה. חזור לדף ההרשמה.");
      setIsSending(false);
      return;
    }

    try {
      const { data } = await fetchJsonWithFallback("send_verification_code.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: selectedMethod,
          email: userDraft.email,
          phone: userDraft.phone,
        }),
      });

      if (!data.success) {
        setError(data.message || "שליחת קוד האימות נכשלה.");
        setIsSending(false);
        return;
      }

      setShowBox(true);
      setDemoCode(data.demoCode || "");
      setMsg(
        `${data.message} קוד לדוגמה לבדיקה מקומית: ${data.demoCode}`
      );
    } catch (err) {
      setError(err?.message || "שגיאה בחיבור לשרת.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !userDraft ||
      !userDraft.fullName ||
      !userDraft.address ||
      !userDraft.username ||
      !userDraft.email ||
      !userDraft.phone ||
      !userDraft.password
    ) {
      setError("חסרים פרטי הרשמה. חזור לדף ההרשמה.");
      return;
    }

    if (!method) {
      setError("יש לבחור אמצעי אימות.");
      return;
    }

    const cleaned = code.replace(/\D/g, "");

    if (!cleaned) {
      setError("יש להזין קוד סודי.");
      return;
    }

    if (cleaned.length !== 6) {
      setError("הקוד הסודי חייב להיות 6 ספרות.");
      return;
    }

    if (demoCode && cleaned !== demoCode) {
      setError("הקוד שהוזן אינו נכון.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await fetchJsonWithFallback("register.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: userDraft.fullName,
          address: userDraft.address,
          username: userDraft.username,
          email: userDraft.email,
          phone: userDraft.phone,
          password: userDraft.password,
          verifyMethod: method,
          verifyCode: cleaned,
        }),
      });

      if (!data.success) {
        setError(data.message || "ההרשמה נכשלה.");
        setIsSubmitting(false);
        return;
      }

      const registeredProfile = {
        id: data.user?.id || "",
        username: data.user?.username || userDraft.username,
        fullName:
          data.user?.fullName ||
          data.user?.full_name ||
          userDraft.fullName,
        address:
          data.user?.address ||
          data.user?.home_address ||
          userDraft.address,
        email: data.user?.email || userDraft.email,
        phone: data.user?.phone || userDraft.phone,
      };

      localStorage.setItem(
        "sporteventLastRegisteredProfile",
        JSON.stringify(registeredProfile)
      );

      localStorage.setItem(
        "sporteventProfileExtras",
        JSON.stringify({
          fullName: registeredProfile.fullName,
          address: registeredProfile.address,
          email: registeredProfile.email,
          phone: registeredProfile.phone,
        })
      );

      setSuccess("נרשמת בהצלחה. מעביר לדף התחברות...");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError(err?.message || "שגיאה בחיבור לשרת.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMethodLabel =
    method === "email" ? "אימייל" : method === "sms" ? "SMS" : "";

  return (
    <div
      className="verify"
      style={{ backgroundImage: `url(${registerBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="verify__overlay" />

      <div className="verify__card" role="region" aria-label="אימות משתמש">
        <div className="verify__header">
          <h1 className="verify__title">אימות משתמש</h1>
          <p className="verify__subtitle">בחר איך לקבל קוד סודי</p>
        </div>

        {!showBox && (
          <div className="verify__choices" aria-label="בחירת אמצעי קבלת קוד">
            <button
              type="button"
              className="verify__btn"
              onClick={() => handleChoose("email")}
              disabled={isSending || isSubmitting}
            >
              {isSending && method === "email" ? "שולח קוד..." : "קבלת קוד במייל"}
            </button>

            <button
              type="button"
              className="verify__btn"
              onClick={() => handleChoose("sms")}
              disabled={isSending || isSubmitting}
            >
              {isSending && method === "sms" ? "שולח קוד..." : "קבלת קוד ב-SMS"}
            </button>
          </div>
        )}

        {showBox && (
          <form className="verify__box" onSubmit={handleVerify} noValidate>
            <div className="verify__msg">
              בחרת {selectedMethodLabel}. {msg}
            </div>

            <label className="verify__label" htmlFor="code">
              הזן קוד סודי
            </label>

            <input
              id="code"
              className={`verify__input ${error ? "verify__input--error" : ""}`}
              type="text"
              inputMode="numeric"
              placeholder="6 ספרות"
              value={code}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                setError("");
                setSuccess("");
              }}
            />

            {error && <div className="verify__error">{error}</div>}
            {success && <div className="verify__msg">{success}</div>}

            <button
              className="verify__continue"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "מאמת..." : "אימות והמשך"}
            </button>
          </form>
        )}

        {!showBox && error && <div className="verify__error">{error}</div>}

        <div className="verify__footer">
          <Link className="verify__footerLink" to="/">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}