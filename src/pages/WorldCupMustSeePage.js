import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./WorldCupMustSeePage.css";
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

export default function WorldCupMustSeePage() {
  const navigate = useNavigate();
  const user = getSavedUser();

  const worldCupMatches = useMemo(
    () => [
      {
        id: "wc-1",
        stage: "שלב הבתים - בית A",
        match: "מקסיקו נגד דרום אפריקה",
        competition: "מונדיאל 2026",
        venue: "Mexico City Stadium",
        location: "מקסיקו סיטי, מקסיקו",
        date: "15/08/2026",
        price: "מחירי פרסום בהמשך",
      },
      {
        id: "wc-2",
        stage: "שלב הבתים - בית B",
        match: "קנדה נגד בוסניה והרצגובינה",
        competition: "מונדיאל 2026",
        venue: "Toronto Stadium",
        location: "טורונטו, קנדה",
        date: "16/08/2026",
        price: "מחירי פרסום בהמשך",
      },
      {
        id: "wc-3",
        stage: "שלב הבתים - בית C",
        match: "ארצות הברית נגד יפן",
        competition: "מונדיאל 2026",
        venue: "Los Angeles Stadium",
        location: "לוס אנג'לס, ארצות הברית",
        date: "16/08/2026",
        price: "מחירי פרסום בהמשך",
      },
      {
        id: "wc-4",
        stage: "שלב הבתים - בית D",
        match: "ספרד נגד ניגריה",
        competition: "מונדיאל 2026",
        venue: "Dallas Stadium",
        location: "דאלאס, ארצות הברית",
        date: "18/08/2026",
        price: "מחירי פרסום בהמשך",
      },
      {
        id: "wc-5",
        stage: "שלב הבתים - בית E",
        match: "ברזיל נגד סרביה",
        competition: "מונדיאל 2026",
        venue: "Miami Stadium",
        location: "מיאמי, ארצות הברית",
        date: "18/08/2026",
        price: "מחירי פרסום בהמשך",
      },
      {
        id: "wc-6",
        stage: "שלב הבתים - בית F",
        match: "אנגליה נגד דרום קוריאה",
        competition: "מונדיאל 2026",
        venue: "Vancouver Stadium",
        location: "ונקובר, קנדה",
        date: "20/08/2026",
        price: "מחירי פרסום בהמשך",
      },
    ],
    []
  );

  const handleOpenEvent = (matchItem) => {
    if (!user) {
      alert("יש להתחבר לאתר על מנת לצפות בפרטי האירוע");
      return;
    }

    navigate(`/event/${matchItem.id}`, {
      state: {
        selectedEvent: {
          id: matchItem.id,
          event_name: matchItem.match,
          title: matchItem.match,
          category: "כדורגל",
          competition: matchItem.competition,
          location: `${matchItem.venue}, ${matchItem.location}`,
          date_time: matchItem.date,
          dateTime: matchItem.date,
          price: matchItem.price,
          stage: matchItem.stage,
        },
      },
    });
  };

  return (
    <div
      className="world-cup-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="world-cup-page__overlay" />

      <header className="world-cup-page__topbar">
        <button
          type="button"
          className="world-cup-page__topBtn"
          onClick={() => navigate("/")}
        >
          חזרה לדף הבית
        </button>

        <h1 className="world-cup-page__topTitle">משחקי מונדיאל 2026</h1>

        <button
          type="button"
          className="world-cup-page__topBtn world-cup-page__topBtn--primary"
          onClick={() => navigate("/events/must-see")}
        >
          חזרה לאירועים שאסור לפספס
        </button>
      </header>

      <main className="world-cup-page__content">
        <section className="world-cup-page__hero">
          <div className="world-cup-page__heroBox">
            <h2 className="world-cup-page__heroTitle">
              המשחקים הראשונים שכבר פורסמו
            </h2>

            <p className="world-cup-page__heroText">
              בדף זה רוכזו המשחקים הבולטים הראשונים של מונדיאל 2026 לפי לוח
              המשחקים שפורסם. אפשר לעבור על האירוע, לבדוק מסגרת, מיקום ותאריך,
              ולהמשיך לעמוד פרטי האירוע.
            </p>
          </div>
        </section>

        <section className="world-cup-page__matchesSection">
          <div className="world-cup-page__matchesGrid">
            {worldCupMatches.map((matchItem) => (
              <article className="world-cup-card" key={matchItem.id}>
                <div className="world-cup-card__badge">
                  {matchItem.competition}
                </div>

                <h3 className="world-cup-card__match">{matchItem.match}</h3>

                <div className="world-cup-card__details">
                  <div className="world-cup-card__row">
                    <span className="world-cup-card__label">
                      מסגרת התחרות:
                    </span>
                    <span className="world-cup-card__value">
                      {matchItem.stage}
                    </span>
                  </div>

                  <div className="world-cup-card__row">
                    <span className="world-cup-card__label">אצטדיון:</span>
                    <span className="world-cup-card__value">
                      {matchItem.venue}
                    </span>
                  </div>

                  <div className="world-cup-card__row">
                    <span className="world-cup-card__label">מיקום:</span>
                    <span className="world-cup-card__value">
                      {matchItem.location}
                    </span>
                  </div>

                  <div className="world-cup-card__row">
                    <span className="world-cup-card__label">תאריך:</span>
                    <span className="world-cup-card__value">
                      {matchItem.date}
                    </span>
                  </div>

                  <div className="world-cup-card__row world-cup-card__row--price">
                    <span className="world-cup-card__label">מחיר:</span>
                    <span className="world-cup-card__value">
                      {matchItem.price}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="world-cup-card__actionBtn"
                  onClick={() => handleOpenEvent(matchItem)}
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