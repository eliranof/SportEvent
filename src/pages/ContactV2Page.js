import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ContactV2Page.css";
import bg from "../assets/img/connect2.png";
import { fetchJsonWithFallback } from "../utils/apiRequest";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export default function ContactV2Page() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [guestType, setGuestType] = useState("");
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const localUser = safeParse(localStorage.getItem("user"));
    const sessionUser = safeParse(sessionStorage.getItem("user"));
    const savedUser = localUser || sessionUser || null;

    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const isLoggedIn = !!user;

  const shouldShowReasonBox = useMemo(() => {
    return subject === "customer-service" || subject === "site-support";
  }, [subject]);

  const handleGuestEnter = () => {
    if (!guestType) {
      alert("בחר סוג פנייה");
      return;
    }

    if (guestType === "member") {
      navigate("/login");
      return;
    }

    if (guestType === "guest") {
      navigate("/contact/guest");
    }
  };

  const handleSubjectClick = (value) => {
    setSubject(value);
    setError("");
    setSuccessMessage("");
  };

  const handleSendLoggedInRequest = async () => {
    setError("");
    setSuccessMessage("");

    if (!subject) {
      setError("יש לבחור נושא פנייה.");
      return;
    }

    if (!reason.trim()) {
      setError("יש לפרט את סיבת הפנייה.");
      return;
    }

    try {
      const payload = {
        senderType: "member",
        userId: user?.id || "",
        username: user?.username || "",
        fullName: user?.fullName || "",
        email: user?.email || "",
        phone: user?.phone || "",
        subject,
        reason: reason.trim(),
      };

      const { data } = await fetchJsonWithFallback("save_contact_request.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!data.success) {
        setError(data.message || "שליחת הפנייה נכשלה.");
        return;
      }

      const popupMessage =
        "בקשתך התקבלה. תשובה תתקבל עד יום עסקים. במקרים דחופים ניתן ליצור קשר בווטסאפ מכל מקום בעולם: +972545499020";

      setSuccessMessage("הפנייה נשלחה בהצלחה לממשק המנהלים.");
      setReason("");
      setSubject("");

      alert(popupMessage);
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      setError(fetchError?.message || "שגיאה בחיבור לשרת.");
    }
  };

  return (
    <div
      className="se-contact-v2"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <header className="se-contact-v2__topbar">
        <button
          type="button"
          className="se-contact-v2__topBtn"
          onClick={() => navigate("/")}
        >
          חזרה לדף הבית
        </button>

        <h1 className="se-contact-v2__title">צור קשר</h1>

        {isLoggedIn ? (
          <button
            type="button"
            className="se-contact-v2__topBtn se-contact-v2__topBtn--primary"
            onClick={() => navigate("/edit-profile")}
          >
            עריכת פרטים
          </button>
        ) : (
          <button
            type="button"
            className="se-contact-v2__topBtn se-contact-v2__topBtn--primary"
            onClick={() => navigate("/login")}
          >
            התחברות
          </button>
        )}
      </header>

      <div className="se-contact-v2__bottomArea">
        {!isLoggedIn ? (
          <div className="se-contact-v2__frame">
            <div className="se-contact-v2__frameHead">
              <h2 className="se-contact-v2__frameTitle">השאר פרטים ליצירת קשר</h2>
              <p className="se-contact-v2__frameSub">בחר סוג פנייה</p>
            </div>

            <div
              className="se-contact-v2__choices"
              role="radiogroup"
              aria-label="סוג פנייה"
            >
              <label
                className={`se-contact-v2__choice ${
                  guestType === "member" ? "se-contact-v2__choice--active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="contactType"
                  value="member"
                  checked={guestType === "member"}
                  onChange={() => setGuestType("member")}
                />
                אני מנוי קיים
              </label>

              <label
                className={`se-contact-v2__choice ${
                  guestType === "guest" ? "se-contact-v2__choice--active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="contactType"
                  value="guest"
                  checked={guestType === "guest"}
                  onChange={() => setGuestType("guest")}
                />
                אורח
              </label>
            </div>

            <div className="se-contact-v2__enterWrap">
              <button
                type="button"
                className="se-contact-v2__enterBtn"
                onClick={handleGuestEnter}
              >
                היכנס
              </button>
            </div>
          </div>
        ) : (
          <div className="se-contact-v2__frame se-contact-v2__frame--logged">
            <div className="se-contact-v2__frameHead">
              <h2 className="se-contact-v2__frameTitle">פנייה למערכות האתר</h2>
              <p className="se-contact-v2__frameSub">
                בחר נושא פנייה ולאחר מכן פרט את סיבת הפנייה שלך
              </p>
            </div>

            <div className="se-contact-v2__loggedContent">
              <div className="se-contact-v2__section">
                <div className="se-contact-v2__label">נושא הפנייה</div>

                <div className="se-contact-v2__topicButtons">
                  <button
                    type="button"
                    className={`se-contact-v2__topicBtn ${
                      subject === "customer-service"
                        ? "se-contact-v2__topicBtn--active"
                        : ""
                    }`}
                    onClick={() => handleSubjectClick("customer-service")}
                  >
                    שירות לקוחות
                  </button>

                  <button
                    type="button"
                    className={`se-contact-v2__topicBtn ${
                      subject === "site-support"
                        ? "se-contact-v2__topicBtn--active"
                        : ""
                    }`}
                    onClick={() => handleSubjectClick("site-support")}
                  >
                    תמיכה באתר
                  </button>
                </div>
              </div>

              {shouldShowReasonBox && (
                <div className="se-contact-v2__section se-contact-v2__section--reason">
                  <label className="se-contact-v2__label" htmlFor="reason">
                    פרט את סיבת הפנייה שלך:
                  </label>

                  <textarea
                    id="reason"
                    className="se-contact-v2__textarea"
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setError("");
                      setSuccessMessage("");
                    }}
                    placeholder="כתוב כאן את פרטי הפנייה..."
                  />

                  {error && <div className="se-contact-v2__error">{error}</div>}

                  {successMessage && (
                    <div className="se-contact-v2__success">{successMessage}</div>
                  )}

                  <button
                    type="button"
                    className="se-contact-v2__sendBtn"
                    onClick={handleSendLoggedInRequest}
                  >
                    שלח
                  </button>
                </div>
              )}

              {!shouldShowReasonBox && (
                <div className="se-contact-v2__helperText">
                  יש לבחור נושא פנייה כדי להמשיך.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}