import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SoldOutWaitlistPage.css";
import bg from "../assets/img/incoming-games.jpg";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getSavedUser() {
  const localUser = safeParse(localStorage.getItem("user"));
  const sessionUser = safeParse(sessionStorage.getItem("user"));
  return localUser || sessionUser || null;
}

export default function SoldOutWaitlistPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedEvent = location.state?.selectedEvent || null;
  const user = getSavedUser();

  const [isTermsApproved, setIsTermsApproved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleContinue = () => {
    if (!selectedEvent) {
      setErrorMessage("לא נבחר אירוע. יש לחזור לעמוד אירועי Sold-out ולבחור אירוע מחדש.");
      return;
    }

    if (!user) {
      alert("יש להתחבר לאתר תחילה");
      navigate("/login");
      return;
    }

    if (!isTermsApproved) {
      setErrorMessage("יש לאשר את תנאי רשימת ההמתנה לפני המשך.");
      return;
    }

    setErrorMessage("");

    navigate("/events/sold-out/waitlist/next", {
      state: {
        selectedEvent,
      },
    });
  };

  return (
    <div
      className="soldout-waitlist"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="soldout-waitlist__overlay" />

      <div className="soldout-waitlist__card">
        <div className="soldout-waitlist__topActions">
          <button
            type="button"
            className="soldout-waitlist__topBtn"
            onClick={() => navigate("/events/sold-out")}
          >
            חזור לאירועי Sold-out
          </button>

          <button
            type="button"
            className="soldout-waitlist__topBtn"
            onClick={() => navigate("/")}
          >
            חזור לדף הבית
          </button>
        </div>

        <div className="soldout-waitlist__header">
          <h1 className="soldout-waitlist__title">הצטרפות לרשימת המתנה</h1>
          <p className="soldout-waitlist__subtitle">
            לאחר אישור התקנון תעבור למסך בחירת מושבים אינטראקטיבית, בדיוק כמו
            בהזמנה רגילה
          </p>
        </div>

        {selectedEvent ? (
          <>
            <div className="soldout-waitlist__eventBox">
              <div className="soldout-waitlist__eventTitle">פרטי האירוע</div>

              <div className="soldout-waitlist__eventRow">
                <span className="soldout-waitlist__eventLabel">אירוע:</span>
                <span className="soldout-waitlist__eventValue">
                  {selectedEvent.teams}
                </span>
              </div>

              <div className="soldout-waitlist__eventRow">
                <span className="soldout-waitlist__eventLabel">מסגרת:</span>
                <span className="soldout-waitlist__eventValue">
                  {selectedEvent.competition || "יעודכן בהמשך"}
                </span>
              </div>

              <div className="soldout-waitlist__eventRow">
                <span className="soldout-waitlist__eventLabel">מיקום:</span>
                <span className="soldout-waitlist__eventValue">
                  {selectedEvent.location}
                </span>
              </div>

              <div className="soldout-waitlist__eventRow">
                <span className="soldout-waitlist__eventLabel">תאריך ושעה:</span>
                <span className="soldout-waitlist__eventValue">
                  {selectedEvent.dateTime}
                </span>
              </div>
            </div>

            <div className="soldout-waitlist__summaryBox">
              <div className="soldout-waitlist__noteTitle">איך זה עובד</div>
              <div className="soldout-waitlist__noteText">
                הבקשה נשמרת בתור מסודר. אם יתפנו מקומות תישלח הודעת דוא"ל,
                תיפתח עבורך אפשרות רכישה, ותקבל חלון זמן מוגבל של 90 דקות כדי
                להשלים את ההזמנה לפני שההצעה תעבור לממתין הבא.
              </div>
            </div>

            <div className="soldout-waitlist__termsBox">
              <div className="soldout-waitlist__termsTitle">תקנון רשימת המתנה</div>

              <ol className="soldout-waitlist__termsList">
                <li className="soldout-waitlist__termItem">
                  ההצטרפות לרשימת ההמתנה מותנית ברכישת כל הכרטיסים כמקשה אחת,
                  בהתאם לכמות שתבחר במסך הבא.
                </li>
                <li className="soldout-waitlist__termItem">
                  בחירת המקומות תתבצע במסך הבא באמצעות מפת מושבים אינטראקטיבית,
                  כמו בתהליך ההזמנה הרגיל באתר.
                </li>
                <li className="soldout-waitlist__termItem">
                  במקרה של התאמה למקומות שהתפנו תישלח אליך הודעת דוא"ל עם
                  אפשרות רכישה.
                </li>
                <li className="soldout-waitlist__termItem">
                  מרגע שליחת ההודעה יעמדו לרשותך 90 דקות בלבד להשלמת הרכישה.
                </li>
                <li className="soldout-waitlist__termItem">
                  אם הרכישה לא תושלם בזמן שהוקצב, ההזמנה תעבור אוטומטית לממתין
                  הבא בתור.
                </li>
              </ol>

              <label className="soldout-waitlist__approveRow">
                <input
                  type="checkbox"
                  className="soldout-waitlist__checkbox"
                  checked={isTermsApproved}
                  onChange={(e) => {
                    setIsTermsApproved(e.target.checked);
                    setErrorMessage("");
                  }}
                />
                <span className="soldout-waitlist__approveText">
                  קראתי ואני מאשר את תנאי רשימת ההמתנה וההתחייבות לרכישה במקרה של
                  התאמה
                </span>
              </label>
            </div>

            {errorMessage && (
              <div className="soldout-waitlist__formMessage">{errorMessage}</div>
            )}

            <div className="soldout-waitlist__actions">
              <button
                type="button"
                className="soldout-waitlist__confirmBtn"
                onClick={handleContinue}
              >
                המשך לבחירת מושבים אינטראקטיבית
              </button>
            </div>
          </>
        ) : (
          <div className="soldout-waitlist__messageBox">
            <p className="soldout-waitlist__message">
              לא נבחר אירוע. יש לחזור לעמוד אירועי Sold-out ולבחור אירוע מחדש.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}