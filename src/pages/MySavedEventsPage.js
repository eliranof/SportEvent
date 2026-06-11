import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import homeBg from "../assets/img/homepage2.png";
import { getAllEvents } from "../services/eventsService";
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

export default function MySavedEventsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const { isMobile } = useResponsive();

  useEffect(() => {
    const currentUser = getLoggedInUser();

    if (!currentUser || !currentUser.id) {
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    fetchJsonWithFallback(`get_saved_events.php?user_id=${currentUser.id}`)
      .then(({ data }) => {
        if (data.success) {
          const ids = Array.isArray(data.events)
            ? data.events.map((item) => String(item.event_id))
            : [];
          setSavedEventIds(ids);
        } else {
          setErrorMessage(data.message || "לא ניתן לטעון את האירועים השמורים");
        }
      })
      .catch((error) => {
        setErrorMessage(error?.message || "שגיאה בטעינת האירועים השמורים");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const savedEvents = useMemo(() => {
    const allEvents = getAllEvents();
    return allEvents.filter((eventItem) =>
      savedEventIds.includes(String(eventItem.id))
    );
  }, [savedEventIds]);

  const handleRemoveSavedEvent = async (eventId) => {
    if (!user || !user.id) {
      setErrorMessage("יש להתחבר כדי להסיר אירוע שמור");
      return;
    }

    setErrorMessage("");
    setActionMessage("");

    try {
      const { data } = await fetchJsonWithFallback("remove_saved_event.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          event_id: String(eventId),
        }),
      });

      if (data.success) {
        setSavedEventIds((prev) =>
          prev.filter((savedId) => String(savedId) !== String(eventId))
        );
        setActionMessage("האירוע הוסר מרשימת השמורים");
      } else {
        setErrorMessage(data.message || "לא ניתן להסיר את האירוע");
      }
    } catch (error) {
      setErrorMessage(error?.message || "שגיאה בחיבור לשרת");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${homeBg})`,
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
          background: "rgba(5, 18, 44, 0.22)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1450px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              height: "56px",
              padding: "0 26px",
              border: "none",
              borderRadius: "16px",
              background: "#2c73ff",
              color: "#ffffff",
              fontSize: "22px",
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
              height: "56px",
              padding: "0 26px",
              border: "none",
              borderRadius: "16px",
              background: "#2c73ff",
              color: "#ffffff",
              fontSize: "22px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            מעבר לאירועים קרובים
          </button>
        </div>

        <section
          style={{
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: "24px",
            padding: "32px",
            color: "#ffffff",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "48px",
              fontWeight: 800,
              textAlign: "center",
            }}
          >
            האירועים השמורים שלי
          </h1>

          {!user ? (
            <div
              style={{
                marginTop: "24px",
                textAlign: "center",
                fontSize: "28px",
                lineHeight: 1.8,
                fontWeight: 700,
              }}
            >
              כדי לצפות באירועים השמורים שלך יש להתחבר למערכת.
            </div>
          ) : loading ? (
            <div
              style={{
                marginTop: "24px",
                textAlign: "center",
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              טוען אירועים שמורים...
            </div>
          ) : errorMessage ? (
            <div
              style={{
                marginTop: "24px",
                textAlign: "center",
                fontSize: "28px",
                color: "#ffd4d4",
                fontWeight: 700,
              }}
            >
              {errorMessage}
            </div>
          ) : savedEvents.length === 0 ? (
            <div
              style={{
                marginTop: "24px",
                textAlign: "center",
                fontSize: "28px",
                lineHeight: 1.8,
                fontWeight: 700,
              }}
            >
              עדיין לא שמרת אירועים.
            </div>
          ) : (
            <>
              {actionMessage && (
                <div
                  style={{
                    marginTop: "22px",
                    marginBottom: "10px",
                    textAlign: "center",
                    fontSize: "26px",
                    color: "#d7ffe0",
                    fontWeight: 700,
                  }}
                >
                  {actionMessage}
                </div>
              )}

              <div
                style={{
                  marginTop: "28px",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: "22px",
                }}
              >
                {savedEvents.map((eventItem) => (
                  <article
                    key={eventItem.id}
                    style={{
                      display: "grid",
                      gap: "14px",
                      padding: "24px",
                      borderRadius: "20px",
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  >
                    <div
                      style={{
                        justifySelf: "start",
                        background: "#2c73ff",
                        color: "#ffffff",
                        fontSize: "18px",
                        fontWeight: 800,
                        padding: "8px 16px",
                        borderRadius: "999px",
                      }}
                    >
                      {eventItem.category || eventItem.tag || "אירוע"}
                    </div>

                    <h3
                      style={{
                        margin: 0,
                        fontSize: "34px",
                        fontWeight: 800,
                        lineHeight: 1.5,
                      }}
                    >
                      {eventItem.teams || eventItem.title}
                    </h3>

                    <div
                      style={{
                        fontSize: "24px",
                        lineHeight: 1.8,
                        fontWeight: 700,
                      }}
                    >
                      <strong>סוג התחרות:</strong>{" "}
                      {eventItem.category || eventItem.tag || "לא צוין"}
                    </div>

                    <div
                      style={{
                        fontSize: "24px",
                        lineHeight: 1.8,
                        fontWeight: 700,
                      }}
                    >
                      <strong>מסגרת התחרות:</strong>{" "}
                      {eventItem.competition || "לא צוין"}
                    </div>

                    <div
                      style={{
                        fontSize: "24px",
                        lineHeight: 1.8,
                        fontWeight: 700,
                      }}
                    >
                      <strong>מיקום:</strong> {eventItem.location}
                    </div>

                    <div
                      style={{
                        fontSize: "24px",
                        lineHeight: 1.8,
                        fontWeight: 700,
                      }}
                    >
                      <strong>תאריך ושעה:</strong> {eventItem.dateTime}
                    </div>

                    <div
                      style={{
                        fontSize: "28px",
                        lineHeight: 1.8,
                        fontWeight: 800,
                      }}
                    >
                      <strong>מחיר החל מ:</strong> {eventItem.price || "טרם נקבע"}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/event/${eventItem.id}`, {
                          state: { selectedEvent: eventItem },
                        })
                      }
                      style={{
                        marginTop: "10px",
                        height: "58px",
                        border: "none",
                        borderRadius: "14px",
                        background: "#2c73ff",
                        color: "#ffffff",
                        fontSize: "22px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      לפרטי האירוע
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveSavedEvent(eventItem.id)}
                      style={{
                        height: "56px",
                        border: "1px solid rgba(255,255,255,0.22)",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.12)",
                        color: "#ffffff",
                        fontSize: "22px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      הסר משמורים
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}