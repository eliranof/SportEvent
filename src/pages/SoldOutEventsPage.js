import React from "react";
import { useNavigate } from "react-router-dom";
import { getSoldOutEvents } from "../services/eventsService";
import "./SoldOutEventsPage.css";
import bg from "../assets/img/mondialgames.png";

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

export default function SoldOutEventsPage() {
  const navigate = useNavigate();
  const user = getSavedUser();
  const soldOutEvents = getSoldOutEvents();

  const handleJoinWaitlist = (eventItem) => {
    if (!user) {
      alert("יש להתחבר לאתר תחילה");
      navigate("/login");
      return;
    }

    navigate("/events/sold-out/waitlist", {
      state: {
        selectedEvent: eventItem,
      },
    });
  };

  return (
    <div
      className="soldout-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="soldout-page__overlay" />

      <header className="soldout-page__topbar">
        <button
          type="button"
          className="soldout-page__topBtn"
          onClick={() => navigate("/events/near")}
        >
          חזור לאירועים קרובים
        </button>

        <h1 className="soldout-page__title">אירועי Sold-out</h1>

        <button
          type="button"
          className="soldout-page__topBtn soldout-page__topBtn--primary"
          onClick={() => navigate("/")}
        >
          חזור לדף הבית
        </button>
      </header>

      <main className="soldout-page__content">
        <section className="soldout-page__hero">
          <h2 className="soldout-page__heroTitle">
            לא מצאת את האירוע שחיפשת? בדוק באירועי sold-out.
          </h2>
          <p className="soldout-page__heroText">
            כאן מופיעים אירועים חדשים בתחום הכדורגל, כדורסל ועוד ענפי ספורט שכל
            הכרטיסים אליהם כבר נמכרו.
          </p>

          {user && (
            <div className="soldout-page__userBox">מחובר כעת: {user.username}</div>
          )}
        </section>

        <section className="soldout-page__grid" aria-label="רשימת אירועי sold-out">
          {soldOutEvents.map((eventItem) => (
            <article className="soldout-card" key={eventItem.id}>
              <div className="soldout-card__badge">{eventItem.category}</div>

              <h3 className="soldout-card__teams">{eventItem.teams}</h3>

              <div className="soldout-card__row">
                <span className="soldout-card__label">מיקום:</span>
                <span className="soldout-card__value">{eventItem.location}</span>
              </div>

              <div className="soldout-card__row">
                <span className="soldout-card__label">תאריך ושעה:</span>
                <span className="soldout-card__value">{eventItem.dateTime}</span>
              </div>

              <div className="soldout-card__status">כל הכרטיסים נמכרו</div>

              <button
                type="button"
                className="soldout-card__btn"
                onClick={() => handleJoinWaitlist(eventItem)}
              >
                הצטרף לרשימת המתנה
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}