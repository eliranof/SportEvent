import React from "react";
import { useNavigate } from "react-router-dom";
import { getWorldSections } from "../services/eventsService";
import "./WorldEventsPage.css";
import bg from "../assets/img/incoming-games.jpg";

export default function WorldEventsPage() {
  const navigate = useNavigate();
  const sections = getWorldSections();

  const handleOpenEvent = (eventItem) => {
    navigate(`/event/${eventItem.id}`, {
      state: {
        selectedEvent: {
          ...eventItem,
          category: eventItem.category || eventItem.tag || "אירוע בעולם",
        },
      },
    });
  };

  return (
    <div
      className="events-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="events-page__overlay" />

      <header className="events-page__topbar">
        <button
          type="button"
          className="events-page__topBtn"
          onClick={() => navigate("/events/all-upcoming")}
        >
          חזרה לכל האירועים
        </button>

        <h1 className="events-page__title">אירועים בעולם</h1>

        <button
          type="button"
          className="events-page__topBtn events-page__topBtn--primary"
          onClick={() => navigate("/")}
        >
          דף הבית
        </button>
      </header>

      <main className="events-page__content">
        {sections.map((section) => (
          <section className="events-section" key={section.title}>
            <h2 className="events-section__title">{section.title}</h2>

            <div className="events-grid">
              {section.items.map((item) => (
                <article className="event-card" key={item.id}>
                  <div className="event-card__badge">
                    {item.category || item.tag}
                  </div>

                  <h3 className="event-card__teams">{item.teams}</h3>

                  <div className="event-card__row">
                    <span className="event-card__label">סוג התחרות:</span>
                    <span className="event-card__value">
                      {item.category || item.tag || "לא צוין"}
                    </span>
                  </div>

                  <div className="event-card__row">
                    <span className="event-card__label">מסגרת התחרות:</span>
                    <span className="event-card__value">
                      {item.competition || "לא צוין"}
                    </span>
                  </div>

                  <div className="event-card__row">
                    <span className="event-card__label">מיקום:</span>
                    <span className="event-card__value">{item.location}</span>
                  </div>

                  <div className="event-card__row">
                    <span className="event-card__label">תאריך ושעה:</span>
                    <span className="event-card__value">{item.dateTime}</span>
                  </div>

                  {item.note && <div className="event-card__note">{item.note}</div>}

                  <button
                    type="button"
                    className="event-card__orderBtn"
                    onClick={() => handleOpenEvent(item)}
                  >
                    לפרטי האירוע
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}