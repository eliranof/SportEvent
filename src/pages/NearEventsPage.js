import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNearEvents } from "../services/eventsService";
import "./NearEventsPage.css";
import incomingBg from "../assets/img/mondialgames.png";

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

export default function NearEventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getSavedUser());
  }, []);

  const groupedEvents = useMemo(() => {
    const events = getNearEvents();

    return events.reduce((acc, eventItem) => {
      const sectionTitle = eventItem.sectionTitle || "אירועים נוספים";

      if (!acc[sectionTitle]) {
        acc[sectionTitle] = [];
      }

      acc[sectionTitle].push(eventItem);
      return acc;
    }, {});
  }, []);

  const handleOpenEvent = (eventItem) => {
    if (!user) {
      alert("יש להתחבר לאתר על מנת לצפות בפרטי האירוע");
      return;
    }

    navigate(`/event/${eventItem.id}`, {
      state: {
        selectedEvent: eventItem,
      },
    });
  };

  const detailsWrapStyle = {
    display: "grid",
    gap: "14px",
    marginTop: "14px",
  };

  const detailsRowStyle = {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "10px",
    alignItems: "start",
  };

  const detailsLabelStyle = {
    fontSize: "30px",
    fontWeight: "800",
    lineHeight: "1.6",
    color: "rgba(255, 255, 255, 0.92)",
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  const detailsValueStyle = {
    fontSize: "30px",
    fontWeight: "800",
    lineHeight: "1.6",
    color: "rgba(255, 255, 255, 0.96)",
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  const detailsPriceStyle = {
    fontSize: "30px",
    fontWeight: "800",
    lineHeight: "1.6",
    color: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  return (
    <div
      className="near-events"
      style={{ backgroundImage: `url(${incomingBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="near-events__overlay" />

      <header className="near-events__topbar">
        <div className="near-events__topbarInner">
          <button
            type="button"
            className="near-events__topBtn"
            onClick={() => navigate("/")}
          >
            חזרה לדף הבית
          </button>

          <h1 className="near-events__pageTitle">אירועים קרובים</h1>

          <button
            type="button"
            className="near-events__topBtn near-events__topBtn--primary"
            onClick={() => navigate(user ? "/" : "/login")}
          >
            {user ? "מחובר" : "התחברות"}
          </button>
        </div>
      </header>

      <main className="near-events__content">
        <section className="near-events__hero">
          <div className="near-events__heroContent">
            <div className="near-events__heroTopPills">
              <button type="button" className="near-events__heroTopPill">
                כרטיסים לאירוע
              </button>

              <button
                type="button"
                className="near-events__heroTopPill near-events__heroTopPill--active"
              >
                כרטיסים חוויה להזמנה
              </button>

              <button type="button" className="near-events__heroTopPill">
                הרשמה בנציגות
              </button>
            </div>

            <h2 className="near-events__heroTitle">
              המשחקים הכי מבוקשים מחכים לך ביציע
            </h2>

            <p className="near-events__heroText">
              כרטיסים לאירועי ספורט מובילים בארץ ובעולם, מחירים משתלמים, מקומות
              מבוקשים וחוויית הזמנה מהירה. התחברו עכשיו כדי לבחור מושבים ולהבטיח
              מקום לפני שהכרטיסים ייגמרו.
            </p>

            <div className="near-events__heroChips">
              <span className="near-events__heroChip">פרטים מלאים להזמנה</span>
              <span className="near-events__heroChip">בחירה מדויקת לצפייה</span>
              <span className="near-events__heroChip">הרשמה מהירה ומאובטחת</span>
            </div>

            <div className="near-events__heroActions">
              <button
                type="button"
                className="near-events__heroAction near-events__heroAction--secondary"
                onClick={() => navigate("/events/sold-out")}
              >
                לא מצאת מקום? עבור לאירועי Sold out
              </button>

              {!user && (
                <>
                  <button
                    type="button"
                    className="near-events__heroAction near-events__heroAction--secondary"
                    onClick={() => navigate("/register")}
                  >
                    להרשמה מהירה
                  </button>

                  <button
                    type="button"
                    className="near-events__heroAction near-events__heroAction--primary"
                    onClick={() => navigate("/login")}
                  >
                    להתחברות ולהזמנה
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="near-events__sections">
          {Object.entries(groupedEvents).map(([sectionTitle, sectionEvents]) => (
            <section className="competition-section" key={sectionTitle}>
              <h2 className="competition-section__title">{sectionTitle}</h2>

              <div className="competition-section__grid">
                {sectionEvents.map((eventItem) => (
                  <article className="event-card" key={eventItem.id}>
                    <div className="event-card__badge">
                      {eventItem.category || "אירוע"}
                    </div>

                    <div className="event-card__teamsBlock">
                      <div className="event-card__team">
                        {eventItem.homeLogoImage ? (
                          <img
                            src={eventItem.homeLogoImage}
                            alt={eventItem.homeTeam}
                            className="event-card__teamLogoImage"
                          />
                        ) : (
                          <span
                            className="event-card__teamLogo"
                            style={{
                              background: eventItem.homeLogoBg || "#2c73ff",
                              color: eventItem.homeLogoColor || "#ffffff",
                            }}
                          >
                            {eventItem.homeLogoText || "HT"}
                          </span>
                        )}

                        <span className="event-card__teamName">
                          {eventItem.homeTeam}
                        </span>
                      </div>

                      <div className="event-card__vs">נגד</div>

                      <div className="event-card__team">
                        {eventItem.awayLogoImage ? (
                          <img
                            src={eventItem.awayLogoImage}
                            alt={eventItem.awayTeam}
                            className="event-card__teamLogoImage"
                          />
                        ) : (
                          <span
                            className="event-card__teamLogo"
                            style={{
                              background: eventItem.awayLogoBg || "#2c73ff",
                              color: eventItem.awayLogoColor || "#ffffff",
                            }}
                          >
                            {eventItem.awayLogoText || "AT"}
                          </span>
                        )}

                        <span className="event-card__teamName">
                          {eventItem.awayTeam}
                        </span>
                      </div>
                    </div>

                    <div className="event-card__details" style={detailsWrapStyle}>
                      <div className="event-card__row" style={detailsRowStyle}>
                        <span className="event-card__label" style={detailsLabelStyle}>
                          מסגרת התחרות:
                        </span>
                        <span className="event-card__value" style={detailsValueStyle}>
                          {eventItem.competition || "לא צוין"}
                        </span>
                      </div>

                      <div className="event-card__row" style={detailsRowStyle}>
                        <span className="event-card__label" style={detailsLabelStyle}>
                          מיקום:
                        </span>
                        <span className="event-card__value" style={detailsValueStyle}>
                          {eventItem.location}
                        </span>
                      </div>

                      <div className="event-card__row" style={detailsRowStyle}>
                        <span className="event-card__label" style={detailsLabelStyle}>
                          תאריך ושעה:
                        </span>
                        <span className="event-card__value" style={detailsValueStyle}>
                          {eventItem.dateTime}
                        </span>
                      </div>

                      <div
                        className="event-card__row event-card__row--price"
                        style={detailsRowStyle}
                      >
                        <span className="event-card__label" style={detailsLabelStyle}>
                          מחיר:
                        </span>
                        <span className="event-card__price" style={detailsPriceStyle}>
                          החל מ {eventItem.price || "טרם נקבע"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="event-card__orderBtn"
                      onClick={() => handleOpenEvent(eventItem)}
                    >
                      לפרטי האירוע
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