import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./MustSeeEventsPage.css";
import bg from "../assets/img/incoming-games.jpg";
import wcLogo from "../assets/img/wc.png";
import euroLigLogo from "../assets/img/eurolig.png";
import tennisLogo from "../assets/img/tennis.png";
import { getFeaturedEvents } from "../services/eventsService";

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

export default function MustSeeEventsPage() {
  const navigate = useNavigate();
  const user = getSavedUser();

  const sections = useMemo(() => {
    return [
      {
        title: "האירועים החמים ביותר להזמנה",
        items: getFeaturedEvents(),
      },
    ];
  }, []);

  const handleOpenFeaturedEvent = (eventItem) => {
    if (!user) {
      alert("יש להתחבר לאתר על מנת לצפות בפרטי האירוע");
      return;
    }

    if (eventItem.id === "must-1") {
      navigate("/events/must-see/world-cup");
      return;
    }

    if (eventItem.id === "must-2") {
      navigate("/events/must-see/grand-slam");
      return;
    }

    if (eventItem.id === "must-3") {
      navigate("/events/must-see/final-four");
      return;
    }
  };

  const getButtonLabel = (eventItem) => {
    if (eventItem.id === "must-1") {
      return "כניסה למשחקי המונדיאל";
    }

    if (eventItem.id === "must-2") {
      return "כניסה לטורניר גרנד סלאם";
    }

    if (eventItem.id === "must-3") {
      return "כניסה לאירוע הפיינל פור";
    }

    return "לפרטי האירוע";
  };

  const getPriceText = (eventItem) => {
    if (eventItem.id === "must-1") {
      return "החל מ 1,990 ₪";
    }

    if (eventItem.id === "must-2") {
      return "החל מ 420 ₪";
    }

    if (eventItem.id === "must-3") {
      return "החל מ 980 ₪";
    }

    return "טרם נקבע";
  };

  const getEventLogo = (eventItem) => {
    if (eventItem.id === "must-1") {
      return wcLogo;
    }

    if (eventItem.id === "must-2") {
      return tennisLogo;
    }

    if (eventItem.id === "must-3") {
      return euroLigLogo;
    }

    return null;
  };

  const getEventLogoAlt = (eventItem) => {
    if (eventItem.id === "must-1") {
      return "לוגו מונדיאל 2026";
    }

    if (eventItem.id === "must-2") {
      return "לוגו טניס";
    }

    if (eventItem.id === "must-3") {
      return "לוגו יורוליג";
    }

    return "לוגו אירוע";
  };

  return (
    <div
      className="must-see-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="must-see-page__overlay" />

      <header className="must-see-page__topbar">
        <div className="must-see-page__topbarInner">
          <button
            type="button"
            className="must-see-page__topBtn"
            onClick={() => navigate("/")}
          >
            חזרה לדף הבית
          </button>

          <h1 className="must-see-page__pageTitle">אירועים שאסור לפספס</h1>

          <button
            type="button"
            className="must-see-page__topBtn must-see-page__topBtn--primary"
            onClick={() => navigate("/events/near")}
          >
            אירועים קרובים
          </button>
        </div>
      </header>

      <main className="must-see-page__content">
        <section className="must-see-page__hero">
          <div className="must-see-page__heroContent">
            <div className="must-see-page__heroTopPills">
              <button type="button" className="must-see-page__heroTopPill">
                אירועי ספורט מובילים
              </button>

              <button
                type="button"
                className="must-see-page__heroTopPill must-see-page__heroTopPill--active"
              >
                חוויות שאסור לפספס
              </button>

              <button type="button" className="must-see-page__heroTopPill">
                הזמנה מהירה ובטוחה
              </button>
            </div>

            <h2 className="must-see-page__heroTitle">
              האירועים הגדולים ביותר מחכים לך עכשיו
            </h2>

            <p className="must-see-page__heroText">
              בחר את האירוע שמעניין אותך, צפה בפרטי האירוע, במחירים ובמסגרת
              התחרות, והמשך ישירות לעמוד הייעודי שלו כדי להשלים הזמנה.
            </p>

            <div className="must-see-page__heroChips">
              <span className="must-see-page__heroChip">מונדיאל 2026</span>
              <span className="must-see-page__heroChip">טניס בינלאומי</span>
              <span className="must-see-page__heroChip">פיינל פור יורוליג</span>
            </div>

            {user && (
              <div className="must-see-page__userBox">
                מחובר כעת: {user.username || user.fullName || "משתמש"}
              </div>
            )}
          </div>
        </section>

        <section className="must-see-page__sections">
          {sections.map((section) => (
            <section className="must-section" key={section.title}>
              <h2 className="must-section__title">{section.title}</h2>

              <div className="must-section__grid">
                {section.items.map((eventItem) => (
                  <article className="must-card" key={eventItem.id}>
                    <div className="must-card__badge">
                      {eventItem.badge || eventItem.competition || "אירוע מוביל"}
                    </div>

                    <div className="must-card__logoWrap">
                      <img
                        src={getEventLogo(eventItem)}
                        alt={getEventLogoAlt(eventItem)}
                        className="must-card__logo"
                      />
                    </div>

                    <div className="must-card__headlineWrap">
                      <h3 className="must-card__headline">
                        {eventItem.title || eventItem.teams}
                      </h3>

                      {eventItem.subtitle && (
                        <p className="must-card__subheadline">
                          {eventItem.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="must-card__details">
                      <div className="must-card__row">
                        <span className="must-card__label">סוג התחרות:</span>
                        <span className="must-card__value">
                          {eventItem.category || "לא צוין"}
                        </span>
                      </div>

                      <div className="must-card__row">
                        <span className="must-card__label">מסגרת התחרות:</span>
                        <span className="must-card__value">
                          {eventItem.competition || "לא צוין"}
                        </span>
                      </div>

                      <div className="must-card__row">
                        <span className="must-card__label">מיקום:</span>
                        <span className="must-card__value">
                          {eventItem.location || "יעודכן בהמשך"}
                        </span>
                      </div>

                      <div className="must-card__row">
                        <span className="must-card__label">תאריך ושעה:</span>
                        <span className="must-card__value">
                          {eventItem.dateTime || "יעודכן בהמשך"}
                        </span>
                      </div>

                      <div className="must-card__row must-card__row--price">
                        <span className="must-card__label">מחיר:</span>
                        <span className="must-card__price">
                          {getPriceText(eventItem)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="must-card__orderBtn"
                      onClick={() => handleOpenFeaturedEvent(eventItem)}
                    >
                      {getButtonLabel(eventItem)}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
      </main>
    </div>
  );
}