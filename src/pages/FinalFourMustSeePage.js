import React from "react";
import { useNavigate } from "react-router-dom";
import "./FinalFourMustSeePage.css";
import bg from "../assets/img/mondialgames.png";
import { getFinalFourMatches } from "../services/eventsService";

export default function FinalFourMustSeePage() {
  const navigate = useNavigate();
  const finalFourMatches = getFinalFourMatches();

  const handleOpenEvent = (eventItem) => {
    navigate(`/event/${eventItem.id}`, {
      state: {
        selectedEvent: eventItem,
      },
    });
  };

  return (
    <div
      className="final-four-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="final-four-page__overlay" />

      <header className="final-four-page__topbar">
        <button
          type="button"
          className="final-four-page__topBtn"
          onClick={() => navigate("/events/must-see")}
        >
          חזרה לאירועים שאסור לפספס
        </button>

        <h1 className="final-four-page__topTitle">
          טורניר פיינל פור יורוליג בדובאי
        </h1>

        <button
          type="button"
          className="final-four-page__topBtn final-four-page__topBtn--primary"
          onClick={() => navigate("/")}
        >
          דף הבית
        </button>
      </header>

      <main className="final-four-page__content">
        <section className="final-four-page__hero">
          <div className="final-four-page__heroBox">
            <h2 className="final-four-page__heroTitle">
              כל המשחקים המרכזיים של הפיינל פור
            </h2>

            <p className="final-four-page__heroText">
              בעמוד זה תוכל לצפות בכל משחקי טורניר הפיינל פור ביורוליג:
              חצי גמר 1, חצי גמר 2, המשחק על המקום השלישי ומשחק הגמר.
              כל משחק מוצג בריבוע נפרד עם מיקום, תאריך, שעה ומחיר.
            </p>
          </div>
        </section>

        <section
          className="final-four-page__matchesSection"
          aria-label="משחקי פיינל פור יורוליג"
        >
          <div className="final-four-page__matchesGrid">
            {finalFourMatches.map((item) => (
              <article className="final-four-card" key={item.id}>
                <div className="final-four-card__badge">
                  {item.round || item.category}
                </div>

                <h3 className="final-four-card__match">
                  {item.teams}
                </h3>

                <div className="final-four-card__details">
                  <div className="final-four-card__row">
                    <span className="final-four-card__label">סוג התחרות:</span>
                    <span className="final-four-card__value">
                      {item.category}
                    </span>
                  </div>

                  <div className="final-four-card__row">
                    <span className="final-four-card__label">מסגרת התחרות:</span>
                    <span className="final-four-card__value">
                      {item.competition}
                    </span>
                  </div>

                  <div className="final-four-card__row">
                    <span className="final-four-card__label">שלב:</span>
                    <span className="final-four-card__value">
                      {item.round}
                    </span>
                  </div>

                  <div className="final-four-card__row">
                    <span className="final-four-card__label">מיקום:</span>
                    <span className="final-four-card__value">
                      {item.location}
                    </span>
                  </div>

                  <div className="final-four-card__row">
                    <span className="final-four-card__label">תאריך ושעה:</span>
                    <span className="final-four-card__value">
                      {item.dateTime}
                    </span>
                  </div>

                  <div className="final-four-card__row final-four-card__row--price">
                    <span className="final-four-card__label">מחיר:</span>
                    <span className="final-four-card__value">
                      {item.price}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="final-four-card__actionBtn"
                  onClick={() => handleOpenEvent(item)}
                >
                  לפרטי האירוע
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}