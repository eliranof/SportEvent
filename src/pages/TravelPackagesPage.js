import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getEventById } from "../services/eventsService";
import {
  getFlightOptionsForEvent,
  getRoomTypes,
  getTravelPackagesForEvent,
} from "../data/travelPackagesData";
import "./TravelPackagesPage.css";
import bg from "../assets/img/incoming-games.jpg";

function buildStars(count) {
  return "★".repeat(count);
}

export default function TravelPackagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const eventItem = useMemo(() => {
    return location.state?.selectedEvent || getEventById(id) || null;
  }, [id, location.state]);

  const packageOptions = useMemo(() => {
    return getTravelPackagesForEvent(eventItem);
  }, [eventItem]);

  const roomTypes = useMemo(() => {
    return getRoomTypes();
  }, []);

  const flightOptions = useMemo(() => {
    return getFlightOptionsForEvent(eventItem);
  }, [eventItem]);

  const [selectedPackageId, setSelectedPackageId] = useState(
    packageOptions[0]?.id || ""
  );
  const [selectedRoomId, setSelectedRoomId] = useState(
    roomTypes[1]?.id || roomTypes[0]?.id || ""
  );
  const [selectedFlightId, setSelectedFlightId] = useState(
    flightOptions[0]?.id || ""
  );

  const selectedPackage =
    packageOptions.find((item) => item.id === selectedPackageId) ||
    packageOptions[0] ||
    null;

  const selectedRoom =
    roomTypes.find((item) => item.id === selectedRoomId) ||
    roomTypes[0] ||
    null;

  const selectedFlight =
    flightOptions.find((item) => item.id === selectedFlightId) ||
    flightOptions[0] ||
    null;

  const packageOnlyTotal =
    (selectedPackage?.basePrice || 0) +
    (selectedRoom?.extraPrice || 0) +
    (selectedFlight?.extraPrice || 0);

  const handleContinue = () => {
    if (!eventItem || !selectedPackage || !selectedRoom || !selectedFlight) {
      return;
    }

    navigate(`/event/${eventItem.id}/seats`, {
      state: {
        selectedEvent: {
          ...eventItem,
          travelPackage: {
            packageId: selectedPackage.id,
            packageTitle: selectedPackage.title,
            hotelName: selectedPackage.hotelName,
            hotelStars: selectedPackage.hotelStars,
            nights: selectedPackage.nights,
            transfers: selectedPackage.transfers,
            breakfast: selectedPackage.breakfast,
            roomTypeId: selectedRoom.id,
            roomTypeLabel: selectedRoom.label,
            roomTypeDescription: selectedRoom.description,
            flightId: selectedFlight.id,
            flightLabel: selectedFlight.label,
            airline: selectedFlight.airline,
            outbound: selectedFlight.outbound,
            inbound: selectedFlight.inbound,
            includes: selectedPackage.extras,
            packageOnlyPrice: packageOnlyTotal,
            packageOnlyPriceText: `${packageOnlyTotal.toLocaleString("he-IL")} ₪`,
          },
        },
      },
    });
  };

  if (!eventItem) {
    return (
      <div
        className="travel-packages-page travel-packages-page--empty"
        dir="rtl"
        lang="he"
      >
        <div className="travel-packages-emptyBox">
          <h1>האירוע לא נמצא</h1>
          <button type="button" onClick={() => navigate("/events/world")}>
            חזרה לאירועים בעולם
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="travel-packages-page"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="travel-packages-page__overlay" />

      <div className="travel-packages-page__container">
        <header className="travel-packages-page__topbar">
          <button
            type="button"
            className="travel-packages-page__topBtn"
            onClick={() =>
              navigate(`/event/${eventItem.id}`, {
                state: { selectedEvent: eventItem },
              })
            }
          >
            חזרה לפרטי האירוע
          </button>

          <h1 className="travel-packages-page__title">
            חבילות משולבות לאירוע
          </h1>

          <button
            type="button"
            className="travel-packages-page__topBtn travel-packages-page__topBtn--primary"
            onClick={() => navigate("/")}
          >
            דף הבית
          </button>
        </header>

        <section className="travel-packages-hero">
          <div className="travel-packages-hero__badge">שלב 3: חבילות משולבות</div>

          <h2 className="travel-packages-hero__eventTitle">
            {eventItem.teams || eventItem.title || "אירוע בעולם"}
          </h2>

          <p className="travel-packages-hero__subtitle">
            כאן המשתמש יכול להשוות בין אפשרויות, לבחור סוג חדר, לבחור מועדי טיסה
            ולראות את כל פרטי החבילה במקום אחד.
          </p>

          <div className="travel-packages-hero__metaGrid">
            <div className="travel-packages-metaCard">
              <span className="travel-packages-metaCard__label">מיקום</span>
              <strong>{eventItem.location || "יעודכן בהמשך"}</strong>
            </div>

            <div className="travel-packages-metaCard">
              <span className="travel-packages-metaCard__label">תאריך האירוע</span>
              <strong>{eventItem.dateTime || "יעודכן בהמשך"}</strong>
            </div>

            <div className="travel-packages-metaCard">
              <span className="travel-packages-metaCard__label">
                מסגרת התחרות
              </span>
              <strong>
                {eventItem.competition || eventItem.category || "יעודכן בהמשך"}
              </strong>
            </div>
          </div>
        </section>

        <section className="travel-packages-section">
          <div className="travel-packages-section__header">
            <h3>השוואה בין חבילות</h3>
            <p>בחר את רמת החבילה המתאימה למשתמש</p>
          </div>

          <div className="travel-packages-grid">
            {packageOptions.map((item) => {
              const isActive = item.id === selectedPackageId;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`travel-package-card ${
                    isActive ? "travel-package-card--active" : ""
                  }`}
                  onClick={() => setSelectedPackageId(item.id)}
                >
                  <div className="travel-package-card__topRow">
                    <span className="travel-package-card__pill">{item.title}</span>
                    <span className="travel-package-card__price">
                      {item.priceLabel}
                    </span>
                  </div>

                  <h4>{item.hotelName}</h4>
                  <div className="travel-package-card__stars">
                    {buildStars(item.hotelStars)}
                  </div>

                  <div className="travel-package-card__info">
                    {item.nights} לילות
                  </div>
                  <div className="travel-package-card__info">
                    {item.breakfast}
                  </div>
                  <div className="travel-package-card__info">
                    {item.transfers}
                  </div>

                  <ul className="travel-package-card__list">
                    {item.extras.map((extra) => (
                      <li key={extra}>{extra}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </section>

        <div className="travel-packages-layout">
          <section className="travel-packages-section">
            <div className="travel-packages-section__header">
              <h3>התאמת סוג חדר</h3>
              <p>בחר את סוג החדר שמתאים להזמנה</p>
            </div>

            <div className="travel-options-grid">
              {roomTypes.map((room) => {
                const isActive = room.id === selectedRoomId;

                return (
                  <button
                    type="button"
                    key={room.id}
                    className={`travel-option-card ${
                      isActive ? "travel-option-card--active" : ""
                    }`}
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    <strong>{room.label}</strong>
                    <span>{room.description}</span>
                    <em>
                      {room.extraPrice === 0
                        ? "ללא תוספת"
                        : `תוספת ${room.extraPrice.toLocaleString("he-IL")} ₪`}
                    </em>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="travel-packages-section">
            <div className="travel-packages-section__header">
              <h3>בחירת מועדי טיסה</h3>
              <p>בחר את אפשרות הטיסה המועדפת</p>
            </div>

            <div className="travel-options-grid">
              {flightOptions.map((flight) => {
                const isActive = flight.id === selectedFlightId;

                return (
                  <button
                    type="button"
                    key={flight.id}
                    className={`travel-option-card ${
                      isActive ? "travel-option-card--active" : ""
                    }`}
                    onClick={() => setSelectedFlightId(flight.id)}
                  >
                    <strong>{flight.label}</strong>
                    <span>{flight.airline}</span>
                    <span>{flight.outbound}</span>
                    <span>{flight.inbound}</span>
                    <em>
                      {flight.extraPrice === 0
                        ? "ללא תוספת"
                        : `תוספת ${flight.extraPrice.toLocaleString("he-IL")} ₪`}
                    </em>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="travel-summary-card">
          <div className="travel-packages-section__header travel-packages-section__header--summary">
            <h3>פרטי החבילה באופן מרוכז</h3>
            <p>זה הסיכום שהמשתמש יראה לפני המשך לבחירת מושבים</p>
          </div>

          <div className="travel-summary-card__row">
            <span>אירוע</span>
            <strong>{eventItem.teams || eventItem.title || "אירוע בעולם"}</strong>
          </div>

          <div className="travel-summary-card__row">
            <span>חבילה</span>
            <strong>{selectedPackage?.title}</strong>
          </div>

          <div className="travel-summary-card__row">
            <span>מלון</span>
            <strong>
              {selectedPackage?.hotelName} |{" "}
              {buildStars(selectedPackage?.hotelStars || 0)}
            </strong>
          </div>

          <div className="travel-summary-card__row">
            <span>סוג חדר</span>
            <strong>{selectedRoom?.label}</strong>
          </div>

          <div className="travel-summary-card__row">
            <span>טיסה</span>
            <strong>{selectedFlight?.label}</strong>
          </div>

          <div className="travel-summary-card__row">
            <span>יציאה</span>
            <strong>{selectedFlight?.outbound}</strong>
          </div>

          <div className="travel-summary-card__row">
            <span>חזרה</span>
            <strong>{selectedFlight?.inbound}</strong>
          </div>

          <div className="travel-summary-card__row travel-summary-card__row--total">
            <span>מחיר חבילה משולבת</span>
            <strong>{packageOnlyTotal.toLocaleString("he-IL")} ₪</strong>
          </div>

          <button
            type="button"
            className="travel-summary-card__continueBtn"
            onClick={handleContinue}
          >
            המשך לבחירת מושבים
          </button>
        </aside>
      </div>
    </div>
  );
}