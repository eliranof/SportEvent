import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PurchaseTicketsPage.css";
import purchaseBg from "../assets/img/purchasetickes.png";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getLoggedInUser() {
  const localUser = safeParse(localStorage.getItem("user"));
  const sessionUser = safeParse(sessionStorage.getItem("user"));
  return localUser || sessionUser || null;
}

export default function PurchaseTicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(() => location.state?.selectedEvent || null);

  useEffect(() => {
    if (location.state?.selectedEvent) {
      return;
    }

    const fallback = safeParse(sessionStorage.getItem("sporteventPurchaseEvent"));
    if (fallback) {
      setSelectedEvent(fallback);
    }
  }, [location.state]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    sessionStorage.setItem("sporteventPurchaseEvent", JSON.stringify(selectedEvent));
  }, [selectedEvent]);

  const currentUser = useMemo(() => getLoggedInUser(), []);

  useEffect(() => {
    if (!currentUser?.id) {
      setErrorMessage("יש להתחבר לפני מעבר לרכישה");
    }
  }, [currentUser]);

  if (!selectedEvent) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#071a3d",
          color: "#fff",
          fontFamily: "Arial, sans-serif",
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        לא נמצאו פרטי רכישה
      </div>
    );
  }

  const handleContinue = () => {
    if (!currentUser?.id) {
      setErrorMessage("יש להתחבר כדי להמשיך לעמוד התשלום");
      return;
    }

    navigate("/purchase-tickets/next", {
      state: {
        selectedEvent,
      },
    });
  };

  return (
    <div
      className="purchase-page"
      dir="rtl"
      lang="he"
      style={{ backgroundImage: `url(${purchaseBg})` }}
    >
      <div className="purchase-page__overlay" />

      <div className="purchase-page__shell">
        <div className="purchase-page__card">
          <div className="purchase-page__header">
            <button
              type="button"
              className="purchase-page__backBtn"
              onClick={() => navigate(-1)}
            >
              חזרה
            </button>

            <h1 className="purchase-page__title">סיכום רכישה</h1>

            <div className="purchase-page__spacer" />
          </div>

          <div className="purchase-page__grid">
            <section className="purchase-page__panel">
              <h2 className="purchase-page__panelTitle">פרטי האירוע</h2>

              <div className="purchase-page__field">
                <label className="purchase-page__label">אירוע</label>
                <input className="purchase-page__input" type="text" value={selectedEvent.title || selectedEvent.teams || ""} readOnly />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">תחרות</label>
                <input className="purchase-page__input" type="text" value={selectedEvent.competition || "לא צוין"} readOnly />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">קטגוריה</label>
                <input className="purchase-page__input" type="text" value={selectedEvent.category || selectedEvent.tag || "לא צוין"} readOnly />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">מיקום</label>
                <input className="purchase-page__input" type="text" value={selectedEvent.location || selectedEvent.stadiumName || "לא צוין"} readOnly />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">תאריך ושעה</label>
                <input className="purchase-page__input" type="text" value={selectedEvent.dateTime || selectedEvent.date_time || "לא צוין"} readOnly />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">כמות כרטיסים</label>
                <input className="purchase-page__input" type="text" value={String(selectedEvent.ticketsCount || 1)} readOnly />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">מושבים שנבחרו</label>
                <textarea
                  className="purchase-page__input purchase-page__input--textarea"
                  value={Array.isArray(selectedEvent.selectedSeats) ? selectedEvent.selectedSeats.join(" | ") : "לא נבחרו מושבים"}
                  readOnly
                />
              </div>
            </section>

            <section className="purchase-page__panel">
              <h2 className="purchase-page__panelTitle">חבילת נופש ותשלום</h2>

              <div className="purchase-page__field">
                <label className="purchase-page__label">חבילת נופש</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={selectedEvent.travelPackage?.packageTitle || "ללא חבילה"}
                  readOnly
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">מלון</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={selectedEvent.travelPackage?.hotelName || "לא נבחר"}
                  readOnly
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">חדר</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={selectedEvent.travelPackage?.roomTypeLabel || "לא נבחר"}
                  readOnly
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">טיסה</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={selectedEvent.travelPackage?.flightLabel || "לא נבחרה"}
                  readOnly
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">מחיר חבילה</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={selectedEvent.packageOnlyPriceText || "0 ₪"}
                  readOnly
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">מחיר כרטיסים</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={selectedEvent.ticketOnlyPriceText || "0 ₪"}
                  readOnly
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">סה"כ לתשלום</label>
                <input
                  className="purchase-page__input purchase-page__input--highlight"
                  type="text"
                  value={selectedEvent.totalPrice || selectedEvent.price || ""}
                  readOnly
                />
              </div>

              {errorMessage ? (
                <div className="purchase-page__error">{errorMessage}</div>
              ) : null}

              <button type="button" className="purchase-page__submit" onClick={handleContinue}>
                מעבר לעמוד התשלום
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}