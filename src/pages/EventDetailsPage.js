import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getEventById } from "../services/eventsService";
import {
  getEventSimulationSummary,
  normalizeEventForSimulation,
  syncEventInventoryFromServer,
} from "../services/seatSimulationService";
import incomingBg from "../assets/img/mondialgames.png";
import { fetchJsonWithFallback } from "../utils/apiRequest";
import useResponsive from "../hooks/useResponsive";

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

function getOccupancyTone(percent) {
  if (percent >= 85) {
    return {
      text: "#ffd7d7",
      bar: "#ef4444",
      track: "rgba(239, 68, 68, 0.18)",
    };
  }

  if (percent >= 60) {
    return {
      text: "#fff1c7",
      bar: "#f59e0b",
      track: "rgba(245, 158, 11, 0.18)",
    };
  }

  return {
    text: "#d8ffe5",
    bar: "#22c55e",
    track: "rgba(34, 197, 94, 0.18)",
  };
}

function glassCardStyle(extra = {}) {
  return {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: "24px",
    padding: "24px",
    color: "#ffffff",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
    ...extra,
  };
}

function infoBoxStyle(extra = {}) {
  return {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    ...extra,
  };
}

function isTravelPackageEligible(eventItem) {
  const location = String(eventItem?.location || "").toLowerCase();

  const israelKeywords = [
    "תל אביב",
    "חיפה",
    "ירושלים",
    "נתניה",
    "באר שבע",
    "אילת",
    "ישראל",
    "רמת השרון",
  ];

  return !israelKeywords.some((keyword) => location.includes(keyword));
}

export default function EventDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const { isMobile } = useResponsive();

  const baseEvent = useMemo(() => {
    const eventFromState = location.state?.selectedEvent || null;
    const eventFromService = getEventById(id);
    return normalizeEventForSimulation(eventFromState || eventFromService);
  }, [id, location.state]);

  useEffect(() => {
    let isMounted = true;

    if (!baseEvent) {
      return undefined;
    }

    syncEventInventoryFromServer(baseEvent).finally(() => {
      if (isMounted) {
        setInventoryVersion((value) => value + 1);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [baseEvent]);

  const simulation = useMemo(() => {
    return getEventSimulationSummary(baseEvent);
  }, [baseEvent, inventoryVersion]);

  const eventItem = simulation?.event || baseEvent;
  const sectionsSummary = simulation?.sectionsSummary || [];
  const availableSeats = simulation?.availableSeats || 0;
  const soldSeats = simulation?.soldSeats || 0;
  const totalSeats = simulation?.totalSeats || 0;
  const occupancyPercent = simulation?.occupancyPercent || 0;
  const occupancyTone = getOccupancyTone(occupancyPercent);

  const eventTitle = eventItem?.teams || eventItem?.title || "אירוע ספורט";
  const eventCategory = eventItem?.category || eventItem?.tag || "אירוע ספורט";
  const eventFramework =
    eventItem?.competition ||
    eventItem?.sectionTitle ||
    "מסגרת התחרות תעודכן בהמשך";
  const stadiumName =
    eventItem?.stadiumName || eventItem?.location || "האצטדיון יעודכן בהמשך";
  const eventDateTime = eventItem?.dateTime || "מועד האירוע יעודכן בהמשך";

  const minDynamicPrice =
    sectionsSummary.length > 0
      ? Math.min(
          ...sectionsSummary
            .map((section) => Number(section.price || 0))
            .filter(Boolean)
        )
      : 0;

  const eventPrice =
    minDynamicPrice > 0
      ? `החל מ ${minDynamicPrice} ₪`
      : eventItem?.price || "טרם נקבע";

  const eventDescription =
    eventItem?.fullDescription ||
    "בעמוד זה מוצגים פרטי האירוע, מחירי כרטיסים, מידע על האצטדיון, רמת תפוסה, נגישות ומעבר לבחירת מושבים.";

  const showTravelPackagesButton = isTravelPackageEligible(eventItem);

  const goToSeats = () => {
    setActionMessage("");
    setSaveError("");
    setSaveMessage("");

    const currentUser = getLoggedInUser();

    if (!currentUser) {
      setActionMessage("יש להתחבר כדי להמשיך לבחירת מושבים.");
      return;
    }

    if (!eventItem) {
      return;
    }

    navigate(`/event/${eventItem.id}/seats`, {
      state: {
        selectedEvent: eventItem,
      },
    });
  };

  const handleSaveEvent = async () => {
    setSaveMessage("");
    setSaveError("");
    setActionMessage("");

    const currentUser = getLoggedInUser();

    if (!currentUser || !currentUser.id) {
      setSaveError("יש להתחבר כדי לשמור אירוע.");
      return;
    }

    try {
      const { data } = await fetchJsonWithFallback("save_event.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          event_id: eventItem.id,
        }),
      });

      if (data.success) {
        setSaveMessage("האירוע נשמר בהצלחה.");
      } else {
        setSaveError(data.message || "שמירת האירוע נכשלה.");
      }
    } catch (error) {
      setSaveError(error?.message || "שגיאה בחיבור לשרת.");
    }
  };

  if (!eventItem) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b1b3d",
          color: "#ffffff",
          display: "grid",
          placeItems: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
        dir="rtl"
        lang="he"
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "38px", fontWeight: 800 }}>
            האירוע לא נמצא
          </h1>

          <button
            type="button"
            onClick={() => navigate("/events/near")}
            style={{
              marginTop: "18px",
              height: "54px",
              padding: "0 26px",
              border: "none",
              borderRadius: "14px",
              background: "#2c73ff",
              color: "#ffffff",
              fontSize: "19px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            חזרה לאירועים קרובים
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: `url(${incomingBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
      dir="rtl"
      lang="he"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 15%, rgba(0,0,0,0.10), rgba(0,0,0,0.45)), linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.42))",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1450px",
          margin: "0 auto",
          padding: "26px 22px 30px",
          display: "grid",
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              height: "54px",
              padding: "0 24px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.30)",
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            חזרה לדף הבית
          </button>

          <button
            type="button"
            onClick={() => navigate("/events/near")}
            style={{
              height: "54px",
              padding: "0 24px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.30)",
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            חזרה לאירועים קרובים
          </button>
        </div>

        <section style={glassCardStyle({ padding: "28px" })}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#2c73ff",
                borderRadius: "999px",
                padding: "10px 18px",
                fontSize: "16px",
                fontWeight: 800,
              }}
            >
              סוג התחרות: {eventCategory}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "999px",
                padding: "10px 18px",
                fontSize: "16px",
                fontWeight: 800,
              }}
            >
              מסגרת התחרות: {eventFramework}
            </div>
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "44px",
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            {eventTitle}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "21px",
              lineHeight: 1.9,
              color: "rgba(255,255,255,0.94)",
            }}
          >
            {eventDescription}
          </p>

          <div
            style={{
              marginTop: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "14px",
            }}
          >
            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "16px", fontWeight: 800, opacity: 0.9 }}>
                מיקום
              </div>
              <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 700 }}>
                {eventItem.location}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "16px", fontWeight: 800, opacity: 0.9 }}>
                אצטדיון או אולם
              </div>
              <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 700 }}>
                {stadiumName}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "16px", fontWeight: 800, opacity: 0.9 }}>
                תאריך ושעה
              </div>
              <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 700 }}>
                {eventDateTime}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "16px", fontWeight: 800, opacity: 0.9 }}>
                מחיר בסיס
              </div>
              <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 700 }}>
                {eventPrice}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "16px", fontWeight: 800, opacity: 0.9 }}>
                מושבים פנויים
              </div>
              <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 700 }}>
                {availableSeats} מתוך {totalSeats}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "16px", fontWeight: 800, opacity: 0.9 }}>
                מושבים שנמכרו
              </div>
              <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 700 }}>
                {soldSeats}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              ...infoBoxStyle({
                padding: "20px",
                background: "rgba(255,255,255,0.08)",
              }),
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: 800 }}>
                רמת תפוסה בזמן אמת
              </span>

              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: occupancyTone.text,
                }}
              >
                {occupancyPercent}% תפוסה
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "18px",
                borderRadius: "999px",
                background: occupancyTone.track,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <div
                style={{
                  width: `${occupancyPercent}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: occupancyTone.bar,
                  transition: "width 0.25s ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={goToSeats}
              style={{
                height: "56px",
                padding: "0 28px",
                border: "none",
                borderRadius: "14px",
                background: "#2c73ff",
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              לבחירת מושבים במפה
            </button>

            {showTravelPackagesButton && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/event/${eventItem.id}/package`, {
                    state: {
                      selectedEvent: eventItem,
                    },
                  })
                }
                style={{
                  height: "56px",
                  padding: "0 28px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.30)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  fontSize: "20px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                חבילות משולבות, טיסות ומלון
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveEvent}
              style={{
                height: "56px",
                padding: "0 28px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.30)",
                background: "rgba(255,255,255,0.12)",
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              שמירת האירוע שלי
            </button>
          </div>

          {actionMessage && (
            <div
              style={{
                marginTop: "14px",
                color: "#fff4c6",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              {actionMessage}
            </div>
          )}

          {saveMessage && (
            <div
              style={{
                marginTop: "14px",
                color: "#d7ffe0",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              {saveMessage}
            </div>
          )}

          {saveError && (
            <div
              style={{
                marginTop: "14px",
                color: "#ffd4d4",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              {saveError}
            </div>
          )}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "18px",
          }}
        >
          <section style={glassCardStyle()}>
            <h2 style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>
              מחירי כרטיסים לפי יציע
            </h2>

            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gap: "12px",
              }}
            >
              {sectionsSummary.map((section, index) => (
                <div
                  key={`${section.code}-${index}`}
                  style={infoBoxStyle({
                    display: "grid",
                    gap: "10px",
                  })}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "22px", fontWeight: 800 }}>
                      {section.title}
                    </span>

                    <span style={{ fontSize: "22px", fontWeight: 800 }}>
                      {section.priceLabel}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "17px",
                      lineHeight: 1.8,
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    {section.note}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.08)",
                        fontSize: "16px",
                        fontWeight: 700,
                      }}
                    >
                      פנויים: {section.availableCount}
                    </div>

                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.08)",
                        fontSize: "16px",
                        fontWeight: 700,
                      }}
                    >
                      נמכרו: {section.soldCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={glassCardStyle({
              display: "grid",
              gap: "18px",
            })}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>
                פרטי האצטדיון והנגישות
              </h2>

              <div
                style={{
                  marginTop: "16px",
                  ...infoBoxStyle(),
                }}
              >
                <div style={{ fontSize: "17px", fontWeight: 800, opacity: 0.9 }}>
                  שם המקום
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "24px",
                    fontWeight: 700,
                  }}
                >
                  {stadiumName}
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>
                נגישות ליציעים
              </h2>

              <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
                {(eventItem.accessibility || []).map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={infoBoxStyle({
                      padding: "16px 18px",
                      fontSize: "18px",
                      fontWeight: 700,
                      lineHeight: 1.8,
                    })}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>
                מרחק מושבים מהמשטח
              </h2>

              <div
                style={{
                  marginTop: "16px",
                  ...infoBoxStyle({
                    padding: "20px",
                    fontSize: "24px",
                    fontWeight: 700,
                  }),
                }}
              >
                {eventItem.distanceFromField}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}