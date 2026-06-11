import React from "react";
import { useNavigate } from "react-router-dom";
import { getFeaturedEvents } from "../services/eventsService";
import "./AllUpcomingEventsPage.css";
import bg from "../assets/img/incoming-games.jpg";

export default function AllUpcomingEventsPage() {
  const navigate = useNavigate();

  const featuredEvents = getFeaturedEvents();

  const handleGoToIsrael = () => {
    navigate("/events/israel");
  };

  const handleGoToWorld = () => {
    navigate("/events/world");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div
      className="all-upcoming-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="all-upcoming-page__overlay" />

      <header className="all-upcoming-page__topbar">
        <button
          type="button"
          className="all-upcoming-page__topBtn"
          onClick={handleGoHome}
        >
          דף הבית
        </button>

        <h1 className="all-upcoming-page__title">כל האירועים הקרובים</h1>

        <button
          type="button"
          className="all-upcoming-page__topBtn all-upcoming-page__topBtn--primary"
          onClick={() => navigate("/events/near")}
        >
          אירועים קרובים
        </button>
      </header>

      <main className="all-upcoming-page__content">
        <section className="all-upcoming-page__intro">
          <h2 className="all-upcoming-page__introTitle">
            בחר קטגוריית אירועים לצפייה
          </h2>

          <p className="all-upcoming-page__introText">
            ניתן לצפות באירועי ספורט בארץ ובעולם, וכן באירועים שאסור לפספס.
          </p>

          <div className="all-upcoming-page__navButtons">
            <button
              type="button"
              className="all-upcoming-page__navBtn"
              onClick={handleGoToIsrael}
            >
              אירועים בארץ
            </button>

            <button
              type="button"
              className="all-upcoming-page__navBtn"
              onClick={handleGoToWorld}
            >
              אירועים בעולם
            </button>

            <button
              type="button"
              className="all-upcoming-page__navBtn all-upcoming-page__navBtn--highlight"
              onClick={() => navigate("/events/must-see")}
            >
              אירועים שאסור לפספס
            </button>
          </div>
        </section>

        <section
          className="all-upcoming-page__featuredGrid"
          aria-label="אירועים שאסור לפספס"
        >
          {featuredEvents.map((eventItem) => (
            <article className="featured-card" key={eventItem.id}>
              {eventItem.badge && (
                <div className="featured-card__badge">{eventItem.badge}</div>
              )}

              <h3 className="featured-card__title">{eventItem.title}</h3>

              {eventItem.subtitle && (
                <p className="featured-card__subtitle">{eventItem.subtitle}</p>
              )}

              <div className="featured-card__row">
                <span className="featured-card__label">מיקום:</span>
                <span className="featured-card__value">{eventItem.location}</span>
              </div>

              <div className="featured-card__row">
                <span className="featured-card__label">תאריך ושעה:</span>
                <span className="featured-card__value">{eventItem.dateTime}</span>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}