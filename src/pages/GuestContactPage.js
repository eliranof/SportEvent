import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GuestContactPage.css";
import bg from "../assets/img/connect2.png";
import { fetchJsonWithFallback } from "../utils/apiRequest";

export default function GuestContactPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubjectClick = (value) => {
    setSubject(value);
    setError("");
    setSuccessMessage("");
  };

  const handleSendGuestRequest = async () => {
    setError("");
    setSuccessMessage("");

    if (!fullName.trim()) {
      setError("יש למלא שם מלא.");
      return;
    }

    if (!email.trim()) {
      setError("יש למלא כתובת אימייל.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setError("יש להזין כתובת אימייל תקינה.");
      return;
    }

    if (!subject) {
      setError("יש לבחור נושא פנייה.");
      return;
    }

    if (!reason.trim()) {
      setError("יש לפרט את תוכן הפנייה.");
      return;
    }

    try {
      setIsSending(true);

      const { data } = await fetchJsonWithFallback("save_contact_request.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderType: "guest",
          userId: "",
          username: "",
          fullName: fullName.trim(),
          email: email.trim(),
          phone: "",
          subject,
          reason: reason.trim(),
        }),
      });

      if (!data.success) {
        setError("שליחת הפנייה נכשלה.");
        return;
      }

      setSuccessMessage("הפנייה נשלחה בהצלחה.");
      setFullName("");
      setEmail("");
      setSubject("");
      setReason("");
    } catch (err) {
      setError(err?.message || "שגיאה בחיבור לשרת.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="se-contact-guest"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <header className="se-contact-guest__topbar">
        <button
          type="button"
          className="se-contact-guest__topBtn"
          onClick={() => navigate("/")}
        >
          חזרה לדף הבית
        </button>

        <h1 className="se-contact-guest__title">צור קשר - אורח</h1>

        <button
          type="button"
          className="se-contact-guest__topBtn se-contact-guest__topBtn--primary"
          onClick={() => navigate("/contact")}
        >
          חזרה לצור קשר
        </button>
      </header>

      <div className="se-contact-guest__bottomArea">
        <div className="se-contact-guest__frame">
          <div className="se-contact-guest__frameHead">
            <h2 className="se-contact-guest__frameTitle">פניית אורח</h2>
            <p className="se-contact-guest__frameSub">
              בחר נושא פנייה ולאחר מכן מלא את פרטיך
            </p>
          </div>

          <div className="se-contact-guest__form">
            <div className="se-contact-guest__field">
              <label className="se-contact-guest__label" htmlFor="fullName">
                שם מלא
              </label>
              <input
                id="fullName"
                type="text"
                className="se-contact-guest__input"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError("");
                  setSuccessMessage("");
                }}
                placeholder="הזן שם מלא"
              />
            </div>

            <div className="se-contact-guest__field">
              <label className="se-contact-guest__label" htmlFor="email">
                אימייל
              </label>
              <input
                id="email"
                type="email"
                className="se-contact-guest__input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccessMessage("");
                }}
                placeholder="הזן כתובת אימייל"
              />
            </div>

            <div className="se-contact-guest__field">
              <div className="se-contact-guest__label">נושא הפנייה</div>

              <div className="se-contact-guest__topicButtons">
                <button
                  type="button"
                  className={`se-contact-guest__topicBtn ${
                    subject === "event-inquiry"
                      ? "se-contact-guest__topicBtn--active"
                      : ""
                  }`}
                  onClick={() => handleSubjectClick("event-inquiry")}
                >
                  בירור אירוע
                </button>

                <button
                  type="button"
                  className={`se-contact-guest__topicBtn ${
                    subject === "site-support"
                      ? "se-contact-guest__topicBtn--active"
                      : ""
                  }`}
                  onClick={() => handleSubjectClick("site-support")}
                >
                  תמיכה באתר
                </button>
              </div>
            </div>

            <div className="se-contact-guest__field">
              <label className="se-contact-guest__label" htmlFor="reason">
                פירוט הפנייה
              </label>
              <textarea
                id="reason"
                className="se-contact-guest__textarea"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError("");
                  setSuccessMessage("");
                }}
                placeholder="כתוב כאן את פרטי הפנייה..."
              />
            </div>

            {error && <div className="se-contact-guest__error">{error}</div>}
            {successMessage && (
              <div className="se-contact-guest__success">{successMessage}</div>
            )}

            <button
              type="button"
              className="se-contact-guest__sendBtn"
              onClick={handleSendGuestRequest}
              disabled={isSending}
            >
              {isSending ? "שולח..." : "שלח פנייה"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}