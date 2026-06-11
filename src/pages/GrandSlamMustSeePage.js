import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./GrandSlamMustSeePage.css";
import bg from "../assets/img/incoming-games.jpg";
import tennisLogo from "../assets/img/tennis.png";

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

function buildSections(basePrice) {
  return [
    {
      code: "VIP",
      title: "VIP מרכזי",
      price: basePrice + 240,
      note: "היציע הקרוב ביותר למשטח",
    },
    {
      code: "WEST",
      title: "מערבי",
      price: basePrice + 120,
      note: "זווית צפייה מצוינת לכל המגרש",
    },
    {
      code: "EAST",
      title: "מזרחי",
      price: basePrice,
      note: "היציע המבוקש ביותר בטורניר",
    },
    {
      code: "FAMILY",
      title: "משפחות",
      price: Math.max(basePrice - 60, 180),
      note: "אזור נוח להזמנה משפחתית",
    },
  ];
}

export default function GrandSlamMustSeePage() {
  const navigate = useNavigate();
  const user = getSavedUser();

  const grandSlamDays = useMemo(() => {
    return [
      {
        id: "gs-1",
        badge: "טקס הפתיחה",
        title: "טקס הפתיחה ומשחקי היום הראשון",
        stage: "יום פתיחה",
        competition: "גרנד סלאם טניס 2026",
        arena: "מרכז הטניס הדר יוסף",
        city: "רמת השרון",
        location: "מרכז הטניס הדר יוסף, רמת השרון",
        dateTime: "18/09/2026 | 18:00",
        price: "420 ₪",
        priceText: "החל מ 420 ₪",
        basePrice: 420,
      },
      {
        id: "gs-2",
        badge: "יום שני",
        title: "יום שני - סבב משחקים מרכזי",
        stage: "יום שני",
        competition: "גרנד סלאם טניס 2026",
        arena: "מרכז הטניס הדר יוסף",
        city: "רמת השרון",
        location: "מרכז הטניס הדר יוסף, רמת השרון",
        dateTime: "19/09/2026 | 17:30",
        price: "480 ₪",
        priceText: "החל מ 480 ₪",
        basePrice: 480,
      },
      {
        id: "gs-3",
        badge: "יום שלישי",
        title: "יום שלישי - משחקי שמינית הגמר",
        stage: "יום שלישי",
        competition: "גרנד סלאם טניס 2026",
        arena: "היכל נוקיה",
        city: "תל אביב",
        location: "היכל נוקיה, תל אביב",
        dateTime: "20/09/2026 | 18:30",
        price: "560 ₪",
        priceText: "החל מ 560 ₪",
        basePrice: 560,
      },
      {
        id: "gs-4",
        badge: "יום רביעי",
        title: "יום רביעי - רבעי הגמר",
        stage: "יום רביעי",
        competition: "גרנד סלאם טניס 2026",
        arena: "היכל נוקיה",
        city: "תל אביב",
        location: "היכל נוקיה, תל אביב",
        dateTime: "22/09/2026 | 19:00",
        price: "690 ₪",
        priceText: "החל מ 690 ₪",
        basePrice: 690,
      },
      {
        id: "gs-5",
        badge: "חצאי הגמר",
        title: "חצאי הגמר",
        stage: "יום חמישי",
        competition: "גרנד סלאם טניס 2026",
        arena: "היכל נוקיה",
        city: "תל אביב",
        location: "היכל נוקיה, תל אביב",
        dateTime: "24/09/2026 | 20:00",
        price: "860 ₪",
        priceText: "החל מ 860 ₪",
        basePrice: 860,
      },
      {
        id: "gs-6",
        badge: "טקס הסיום",
        title: "טקס הסיום וטורנירי הגמר",
        stage: "יום הגמר",
        competition: "גרנד סלאם טניס 2026",
        arena: "היכל נוקיה",
        city: "תל אביב",
        location: "היכל נוקיה, תל אביב",
        dateTime: "26/09/2026 | 21:00",
        price: "1,050 ₪",
        priceText: "החל מ 1,050 ₪",
        basePrice: 1050,
      },
    ];
  }, []);

  const handleOpenSeatSelection = (item) => {
    if (!user) {
      alert("יש להתחבר לאתר על מנת לבחור מושבים");
      navigate("/login");
      return;
    }

    navigate(`/event/${item.id}/seats`, {
      state: {
        selectedEvent: {
          id: item.id,
          title: `גרנד סלאם טניס - ${item.title}`,
          teams: `גרנד סלאם טניס - ${item.title}`,
          category: "טניס",
          competition: item.competition,
          location: item.location,
          stadiumName: item.arena,
          dateTime: item.dateTime,
          price: item.price,
          fullDescription:
            "בחר את מקומות הישיבה שלך מתוך מפת מושבים אינטרקטיבית. בעמוד זה ניתן לבחור יציע, שורה וכיסא בצורה מדויקת, לצפות ברמת התפוסה, במרחק מהמשטח ובמחירי היציעים.",
          distanceFromField: "6 עד 24 מטרים",
          accessibility: [
            "גישה מלאה לכיסאות גלגלים",
            "כניסה נגישה ליציעים המרכזיים",
            "מקומות ישיבה נגישים סמוך למעברים",
            "צוות שירות זמין לאורך המתחם",
          ],
          sections: buildSections(item.basePrice),
        },
      },
    });
  };

  return (
    <div
      className="grand-slam-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="grand-slam-page__overlay" />

      <header className="grand-slam-page__topbar">
        <button
          type="button"
          className="grand-slam-page__topBtn"
          onClick={() => navigate("/events/must-see")}
        >
          חזרה לאירועים שאסור לפספס
        </button>

        <h1 className="grand-slam-page__topTitle">טורניר גרנד סלאם טניס</h1>

        <button
          type="button"
          className="grand-slam-page__topBtn grand-slam-page__topBtn--primary"
          onClick={() => navigate("/")}
        >
          דף הבית
        </button>
      </header>

      <main className="grand-slam-page__content">
        <section className="grand-slam-page__hero">
          <div className="grand-slam-page__heroBox">
            <img
              src={tennisLogo}
              alt="לוגו טניס"
              className="grand-slam-page__heroLogo"
            />

            <h2 className="grand-slam-page__heroTitle">
              רשימת אירועי הטורניר
            </h2>

            <p className="grand-slam-page__heroText">
              בדף זה מרוכזים כל ימי טורניר הגרנד סלאם: טקס הפתיחה, ימי
              המשחקים, חצאי הגמר, טקס הסיום וטורנירי הגמר. חלק מהימים נערכים
              במרכז הטניס הדר יוסף ברמת השרון וחלק בהיכל נוקיה בתל אביב.
            </p>
          </div>
        </section>

        <section className="grand-slam-page__cardsSection">
          <div className="grand-slam-page__cardsGrid">
            {grandSlamDays.map((item) => (
              <article className="grand-slam-card" key={item.id}>
                <div className="grand-slam-card__badge">{item.badge}</div>

                <h3 className="grand-slam-card__title">{item.title}</h3>

                <div className="grand-slam-card__details">
                  <div className="grand-slam-card__row">
                    <span className="grand-slam-card__label">סוג התחרות:</span>
                    <span className="grand-slam-card__value">טניס</span>
                  </div>

                  <div className="grand-slam-card__row">
                    <span className="grand-slam-card__label">מסגרת התחרות:</span>
                    <span className="grand-slam-card__value">{item.competition}</span>
                  </div>

                  <div className="grand-slam-card__row">
                    <span className="grand-slam-card__label">שלב בטורניר:</span>
                    <span className="grand-slam-card__value">{item.stage}</span>
                  </div>

                  <div className="grand-slam-card__row">
                    <span className="grand-slam-card__label">אולם:</span>
                    <span className="grand-slam-card__value">{item.arena}</span>
                  </div>

                  <div className="grand-slam-card__row">
                    <span className="grand-slam-card__label">מיקום:</span>
                    <span className="grand-slam-card__value">{item.city}</span>
                  </div>

                  <div className="grand-slam-card__row">
                    <span className="grand-slam-card__label">תאריך ושעה:</span>
                    <span className="grand-slam-card__value">{item.dateTime}</span>
                  </div>

                  <div className="grand-slam-card__row grand-slam-card__row--price">
                    <span className="grand-slam-card__label">מחיר:</span>
                    <span className="grand-slam-card__price">{item.priceText}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="grand-slam-card__actionBtn"
                  onClick={() => handleOpenSeatSelection(item)}
                >
                  לבחירת מושבים
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}