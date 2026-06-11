import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getEventSimulationSummary,
  normalizeEventForSimulation,
  syncEventInventoryFromServer,
} from "../services/seatSimulationService";
import { fetchJsonWithFallback } from "../utils/apiRequest";
import purchaseBg from "../assets/img/purchasetickes.png";

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

function getZoneKey(section, index) {
  const raw = `${section?.code || ""} ${section?.title || ""}`.toLowerCase();

  if (raw.includes("vip")) return "vip";
  if (raw.includes("west") || raw.includes("מערב")) return "west";
  if (raw.includes("east") || raw.includes("מזרח")) return "east";
  if (raw.includes("family") || raw.includes("משפ")) return "family";

  const fallbackOrder = ["vip", "west", "east", "family"];
  return fallbackOrder[index] || `zone-${index}`;
}

function getSeatCoordinates(zoneKey, rowNumber, seatNumber) {
  const rowIndex = Number(rowNumber) - 1;
  const seatIndex = Number(seatNumber) - 1;

  if (zoneKey === "vip") {
    return { x: 365 + seatIndex * 52, y: 132 + rowIndex * 44 };
  }

  if (zoneKey === "family") {
    return { x: 365 + seatIndex * 52, y: 575 + rowIndex * 44 };
  }

  if (zoneKey === "west") {
    return { x: 180 + rowIndex * 56, y: 250 + seatIndex * 38 };
  }

  if (zoneKey === "east") {
    return { x: 820 - rowIndex * 56, y: 250 + seatIndex * 38 };
  }

  return { x: 365 + seatIndex * 52, y: 132 + rowIndex * 44 };
}

function getStandRect(zoneKey) {
  if (zoneKey === "vip") {
    return { x: 315, y: 85, width: 370, height: 120, labelX: 500, labelY: 116 };
  }

  if (zoneKey === "family") {
    return { x: 315, y: 540, width: 370, height: 120, labelX: 500, labelY: 571 };
  }

  if (zoneKey === "west") {
    return { x: 120, y: 215, width: 165, height: 270, labelX: 202, labelY: 246 };
  }

  if (zoneKey === "east") {
    return { x: 715, y: 215, width: 165, height: 270, labelX: 797, labelY: 246 };
  }

  return { x: 315, y: 85, width: 370, height: 120, labelX: 500, labelY: 116 };
}

function glassCardStyle(extra = {}) {
  return {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: "24px",
    padding: "30px",
    color: "#ffffff",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
    ...extra,
  };
}

function infoBoxStyle(extra = {}) {
  return {
    padding: "20px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    ...extra,
  };
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

function topButtonStyle() {
  return {
    height: "64px",
    padding: "0 28px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.30)",
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function inputStyle() {
  return {
    width: "100%",
    minHeight: "66px",
    padding: "16px 18px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.9)",
    color: "#111827",
    fontSize: "24px",
    fontWeight: 600,
    boxSizing: "border-box",
    outline: "none",
  };
}

function fieldLabelStyle() {
  return {
    fontSize: "24px",
    fontWeight: 800,
    marginBottom: "10px",
    display: "block",
  };
}

export default function SoldOutWaitlistNextPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedEvent = location.state?.selectedEvent || null;
  const user = getSavedUser();

  const [desiredTicketCount, setDesiredTicketCount] = useState("");
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [hoveredSeatId, setHoveredSeatId] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isBundleApproved, setIsBundleApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventoryVersion, setInventoryVersion] = useState(0);

  const eventItem = useMemo(() => {
    return normalizeEventForSimulation(selectedEvent);
  }, [selectedEvent]);

  useEffect(() => {
    let isMounted = true;

    if (!eventItem) {
      return undefined;
    }

    syncEventInventoryFromServer(eventItem).finally(() => {
      if (isMounted) {
        setInventoryVersion((value) => value + 1);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [eventItem]);

  const simulation = useMemo(() => {
    return getEventSimulationSummary(eventItem);
  }, [eventItem, inventoryVersion]);

  const seats = simulation?.seats || [];
  const sectionsSummary = simulation?.sectionsSummary || [];
  const availableSeats = simulation?.availableSeats || 0;
  const totalSeats = simulation?.totalSeats || 0;
  const soldSeats = simulation?.soldSeats || 0;
  const occupancyPercent = simulation?.occupancyPercent || 0;
  const occupancyText = simulation?.occupancyText || "0% תפוסה";
  const occupancyTone = getOccupancyTone(occupancyPercent);

  const maxSelectable = Math.min(3, availableSeats || 3);

  const selectedSeatsDetailed = useMemo(() => {
    return seats.filter((seat) => selectedSeatIds.includes(seat.id));
  }, [seats, selectedSeatIds]);

  const hoveredSeat = useMemo(() => {
    return seats.find((seat) => seat.id === hoveredSeatId) || null;
  }, [hoveredSeatId, seats]);

  const totalPrice = useMemo(() => {
    return selectedSeatsDetailed.reduce((sum, seat) => sum + seat.price, 0);
  }, [selectedSeatsDetailed]);

  const mapSections = useMemo(() => {
    return sectionsSummary.map((section, index) => {
      const zoneKey = getZoneKey(section, index);
      const standRect = getStandRect(zoneKey);

      const sectionSeats = seats
        .filter((seat) => seat.sectionCode === section.code)
        .sort((a, b) => {
          if (a.rowNumber !== b.rowNumber) {
            return a.rowNumber - b.rowNumber;
          }
          return a.seatNumber - b.seatNumber;
        })
        .map((seat) => ({
          ...seat,
          ...getSeatCoordinates(zoneKey, seat.rowNumber, seat.seatNumber),
        }));

      return {
        ...section,
        zoneKey,
        standRect,
        seats: sectionSeats,
      };
    });
  }, [sectionsSummary, seats]);

  const eventType =
    eventItem?.category || eventItem?.tag || "סוג התחרות יעודכן בהמשך";

  const eventCompetition =
    eventItem?.competition || "מסגרת התחרות תעודכן בהמשך";

  const stadiumName =
    eventItem?.stadiumName || eventItem?.location || "שם האצטדיון יעודכן בהמשך";

  const distanceFromField =
    eventItem?.distanceFromField || "מרחק המושבים מהמשטח יעודכן בהמשך";

  const accessibilityItems =
    Array.isArray(eventItem?.accessibility) && eventItem.accessibility.length > 0
      ? eventItem.accessibility
      : ["מידע נגישות יעודכן בהמשך"];

  const clearMessage = () => {
    setPageMessage("");
    setMessageType("");
  };

  const showMessage = (text, type = "info") => {
    setPageMessage(text);
    setMessageType(type);
  };

  const handleDesiredTicketCountChange = (value) => {
    clearMessage();

    const digitsOnly = String(value).replace(/\D/g, "");

    if (!digitsOnly) {
      setDesiredTicketCount("");
      setSelectedSeatIds([]);
      return;
    }

    let numericValue = Number(digitsOnly);

    if (numericValue < 1) {
      numericValue = 1;
    }

    if (numericValue > maxSelectable) {
      numericValue = maxSelectable;
    }

    setDesiredTicketCount(String(numericValue));

    if (selectedSeatIds.length > numericValue) {
      setSelectedSeatIds((prev) => prev.slice(0, numericValue));
      showMessage("כמות המושבים שנבחרה עודכנה לפי מספר הכרטיסים שהוזן.", "info");
    }
  };

  const handleSeatClick = (seat) => {
    clearMessage();

    if (seat.status === "sold") {
      showMessage("המושב שבחרת כבר תפוס.", "error");
      return;
    }

    const alreadySelected = selectedSeatIds.includes(seat.id);

    if (alreadySelected) {
      setSelectedSeatIds((prev) => prev.filter((seatId) => seatId !== seat.id));
      return;
    }

    if (!desiredTicketCount) {
      showMessage("יש להזין קודם מספר כרטיסים.", "error");
      return;
    }

    const desiredCountNumber = Number(desiredTicketCount) || 0;

    if (selectedSeatIds.length >= desiredCountNumber) {
      showMessage(
        `הוגדרו ${desiredCountNumber} כרטיסים. כדי לבחור מושב נוסף צריך לבטל מושב קיים או לשנות את כמות הכרטיסים.`,
        "error"
      );
      return;
    }

    setSelectedSeatIds((prev) => [...prev, seat.id]);
  };

  const handleSubmit = async () => {
    clearMessage();

    if (!selectedEvent || !eventItem) {
      showMessage("לא נבחר אירוע. חזור לעמוד הקודם ובחר אירוע מחדש.", "error");
      return;
    }

    if (!user) {
      alert("יש להתחבר לאתר תחילה");
      navigate("/login");
      return;
    }

    if (!desiredTicketCount) {
      showMessage("יש להזין מספר כרטיסים.", "error");
      return;
    }

    const desiredCountNumber = Number(desiredTicketCount) || 0;

    if (selectedSeatIds.length === 0) {
      showMessage("יש לבחור לפחות מושב אחד מתוך המפה.", "error");
      return;
    }

    if (selectedSeatIds.length !== desiredCountNumber) {
      showMessage(
        `בחרת ${selectedSeatIds.length} מושבים, אבל הוזנו ${desiredCountNumber} כרטיסים.`,
        "error"
      );
      return;
    }

    const uniqueSections = [
      ...new Set(
        selectedSeatsDetailed
          .map((seat) => String(seat.sectionTitle || seat.sectionCode || "").trim())
          .filter(Boolean)
      ),
    ];

    if (uniqueSections.length !== 1) {
      showMessage("ברשימת ההמתנה יש לבחור מושבים מאותו יציע בלבד.", "error");
      return;
    }

    const selectedStand = uniqueSections[0] || "";

    if (!isBundleApproved) {
      showMessage("יש לאשר התחייבות לרכישה כמקשה אחת.", "error");
      return;
    }


    const selectedSeatsShort = selectedSeatsDetailed.map(
      (seat) => `${seat.sectionCode}-${seat.rowNumber}-${seat.seatNumber}`
    );

    const selectedSeatsLabels = selectedSeatsDetailed.map((seat) => seat.label);

    setIsSubmitting(true);

    try {
      const { data, rawText, url } = await fetchJsonWithFallback("save_waitlist.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          username: user.username || "",
          email: user.email || "",
          full_name: user.fullName || user.full_name || "",
          event_id: String(eventItem.id || ""),
          event_name: eventItem.teams || "",
          competition: eventCompetition,
          location: eventItem.location || "",
          date_time: eventItem.dateTime || "",
          tickets_count: desiredCountNumber,
          selection_mode: "seats",
          stand: selectedStand,
          preferred_row: "",
          selected_seats: selectedSeatsLabels,
          selected_seats_short: selectedSeatsShort,
          selected_seat_ids: selectedSeatIds,
          bundle_purchase_approved: isBundleApproved ? 1 : 0,
          payment_method: "waitlist_later",
          wallet_provider: "",
          card_number: "",
          owner_id: "",
          expiry_date: "",
          cvv: "",
        }),
      });

      if (!data) {
        showMessage(`השרת החזיר תשובה לא תקינה מהנתיב: ${url}`, "error");
        console.error("save_waitlist raw response:", rawText);
        return;
      }

      if (!data.success) {
        const serverMessage = data?.message || "שמירת הבקשה לרשימת ההמתנה נכשלה";
        const serverDetails = data?.details ? `: ${data.details}` : "";
        showMessage(serverMessage + serverDetails, "error");
        console.error("save_waitlist server error:", data);
        return;
      }

      alert(
        `הבקשה נשמרה בהצלחה. מספרך בתור: ${data.queue_position || "יעודכן בהמשך"}`
      );

      navigate("/personal-area");
    } catch (error) {
      const details = error?.message ? `: ${error.message}` : "";
      const failedUrl = error?.url ? ` | ${error.url}` : "";
      showMessage(`שגיאת רשת${details}${failedUrl}`, "error");
      console.error("save_waitlist network error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!eventItem) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: `url(${purchaseBg})`,
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
            "radial-gradient(circle at 20% 15%, rgba(0,0,0,0.12), rgba(0,0,0,0.45)), linear-gradient(180deg, rgba(0,0,0,0.16), rgba(0,0,0,0.44))",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1450px",
          margin: "0 auto",
          padding: "24px 22px 30px",
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
            onClick={() =>
              navigate("/events/sold-out/waitlist", {
                state: { selectedEvent },
              })
            }
            style={topButtonStyle()}
          >
            חזור לתנאים
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            style={topButtonStyle()}
          >
            חזרה לדף הבית
          </button>
        </div>

        <section style={glassCardStyle({ padding: "34px" })}>
          <h1 style={{ margin: 0, fontSize: "54px", fontWeight: 800 }}>
            בחירת מושבים מתוך מפת המגרש
          </h1>

          <p
            style={{
              margin: "16px 0 0",
              fontSize: "30px",
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.94)",
              fontWeight: 600,
            }}
          >
            {eventItem.teams} | {eventItem.location} | {eventItem.dateTime}
          </p>

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "14px 22px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.20)",
                fontSize: "22px",
                fontWeight: 800,
              }}
            >
              סוג התחרות: {eventType}
            </div>

            <div
              style={{
                display: "inline-block",
                padding: "14px 22px",
                borderRadius: "999px",
                background: "rgba(44,115,255,0.24)",
                border: "1px solid rgba(132,176,255,0.22)",
                fontSize: "22px",
                fontWeight: 800,
              }}
            >
              מסגרת התחרות: {eventCompetition}
            </div>

            <div
              style={{
                display: "inline-block",
                padding: "14px 22px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.20)",
                fontSize: "22px",
                fontWeight: 800,
              }}
            >
              אצטדיון או אולם: {stadiumName}
            </div>
          </div>

          <div
            style={{
              marginTop: "22px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "22px", fontWeight: 800, opacity: 0.9 }}>
                רמת תפוסה
              </div>
              <div style={{ marginTop: "10px", fontSize: "34px", fontWeight: 700 }}>
                {occupancyText}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "22px", fontWeight: 800, opacity: 0.9 }}>
                מקומות פנויים
              </div>
              <div style={{ marginTop: "10px", fontSize: "34px", fontWeight: 700 }}>
                {availableSeats} מתוך {totalSeats}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "22px", fontWeight: 800, opacity: 0.9 }}>
                מושבים שנמכרו
              </div>
              <div style={{ marginTop: "10px", fontSize: "34px", fontWeight: 700 }}>
                {soldSeats}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "22px", fontWeight: 800, opacity: 0.9 }}>
                מספר כרטיסים רצוי
              </div>
              <input
                type="number"
                min="1"
                max={maxSelectable}
                value={desiredTicketCount}
                onChange={(e) => handleDesiredTicketCountChange(e.target.value)}
                placeholder={`עד ${maxSelectable}`}
                style={{
                  marginTop: "12px",
                  width: "100%",
                  height: "62px",
                  borderRadius: "12px",
                  border: "none",
                  padding: "0 16px",
                  fontSize: "28px",
                  fontWeight: 700,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "22px",
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
              <span style={{ fontSize: "22px", fontWeight: 800 }}>
                תפוסה דינמית של האירוע
              </span>

              <span
                style={{
                  fontSize: "24px",
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
              marginTop: "20px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "999px",
                background: "rgba(44,115,255,0.22)",
                border: "1px solid rgba(132,176,255,0.22)",
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              כחול = פנוי
            </div>

            <div
              style={{
                padding: "14px 18px",
                borderRadius: "999px",
                background: "rgba(46,177,94,0.25)",
                border: "1px solid rgba(163,238,183,0.25)",
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              ירוק = נבחר
            </div>

            <div
              style={{
                padding: "14px 18px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              אפור = תפוס
            </div>
          </div>

          {pageMessage && (
            <div
              style={{
                marginTop: "18px",
                padding: "16px 18px",
                borderRadius: "16px",
                fontSize: "20px",
                fontWeight: 700,
                background:
                  messageType === "error"
                    ? "rgba(239,68,68,0.18)"
                    : "rgba(44,115,255,0.18)",
                border:
                  messageType === "error"
                    ? "1px solid rgba(239,68,68,0.30)"
                    : "1px solid rgba(44,115,255,0.30)",
                color: "#ffffff",
              }}
            >
              {pageMessage}
            </div>
          )}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <section style={glassCardStyle()}>
            <h2 style={{ margin: 0, fontSize: "40px", fontWeight: 800 }}>
              מפת מושבים אינטראקטיבית
            </h2>

            <div
              style={{
                marginTop: "18px",
                borderRadius: "24px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(11,27,61,0.35)",
              }}
            >
              <svg
                viewBox="0 0 1000 720"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  background:
                    "radial-gradient(circle at center, rgba(35,125,72,0.25), rgba(8,20,37,0.18))",
                }}
              >
                <defs>
                  <linearGradient id="fieldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2e8f57" />
                    <stop offset="100%" stopColor="#217146" />
                  </linearGradient>
                  <filter id="seatGlow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect x="0" y="0" width="1000" height="720" fill="rgba(9,18,34,0.55)" />

                {mapSections.map((section) => (
                  <g key={`stand-${section.code}`}>
                    <rect
                      x={section.standRect.x}
                      y={section.standRect.y}
                      width={section.standRect.width}
                      height={section.standRect.height}
                      rx="26"
                      fill="rgba(255,255,255,0.08)"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="2"
                    />
                    <text
                      x={section.standRect.labelX}
                      y={section.standRect.labelY}
                      fill="#ffffff"
                      fontSize="34"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {section.title}
                    </text>
                    <text
                      x={section.standRect.labelX}
                      y={section.standRect.labelY + 40}
                      fill="rgba(255,255,255,0.82)"
                      fontSize="24"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {section.priceLabel}
                    </text>
                  </g>
                ))}

                <rect
                  x="300"
                  y="220"
                  width="400"
                  height="280"
                  rx="32"
                  fill="url(#fieldFill)"
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth="4"
                />
                <line
                  x1="500"
                  y1="220"
                  x2="500"
                  y2="500"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="4"
                />
                <circle
                  cx="500"
                  cy="360"
                  r="52"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="4"
                />
                <rect
                  x="300"
                  y="300"
                  width="48"
                  height="120"
                  rx="8"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="4"
                />
                <rect
                  x="652"
                  y="300"
                  width="48"
                  height="120"
                  rx="8"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="4"
                />
                <text
                  x="500"
                  y="360"
                  fill="rgba(255,255,255,0.9)"
                  fontSize="44"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  המגרש
                </text>

                {mapSections.flatMap((section) =>
                  section.seats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isSold = seat.status === "sold";

                    const fillColor = isSold
                      ? "rgba(255,255,255,0.45)"
                      : isSelected
                      ? "rgba(46,177,94,0.95)"
                      : "rgba(44,115,255,0.95)";

                    const strokeColor = isSelected
                      ? "rgba(225,255,236,0.95)"
                      : "rgba(255,255,255,0.85)";

                    return (
                      <g key={seat.id}>
                        <circle
                          cx={seat.x}
                          cy={seat.y}
                          r="24"
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? "4" : "3"}
                          filter="url(#seatGlow)"
                          style={{
                            cursor: isSold ? "not-allowed" : "pointer",
                          }}
                          onMouseEnter={() => setHoveredSeatId(seat.id)}
                          onMouseLeave={() => setHoveredSeatId("")}
                          onClick={() => handleSeatClick(seat)}
                        />
                        <text
                          x={seat.x}
                          y={seat.y + 7}
                          fill="#ffffff"
                          fontSize="18"
                          fontWeight="800"
                          textAnchor="middle"
                          style={{ pointerEvents: "none" }}
                        >
                          {seat.seatNumber}
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "12px",
              }}
            >
              {mapSections.map((section) => (
                <div
                  key={`summary-${section.code}`}
                  style={infoBoxStyle({
                    display: "grid",
                    gap: "10px",
                  })}
                >
                  <div style={{ fontSize: "26px", fontWeight: 800 }}>
                    {section.title}
                  </div>
                  <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.9)" }}>
                    {section.note}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 700 }}>
                    פנויים: {section.availableCount}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 700 }}>
                    מחיר: {section.priceLabel}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside
            style={glassCardStyle({
              display: "grid",
              gap: "18px",
            })}
          >
            <h2 style={{ margin: 0, fontSize: "40px", fontWeight: 800 }}>
              סיכום בחירה
            </h2>

            <div style={infoBoxStyle({ display: "grid", gap: "14px" })}>
              <div style={{ fontSize: "26px", fontWeight: 700 }}>
                {eventItem.teams}
              </div>

              <div style={{ fontSize: "20px", lineHeight: 1.8 }}>
                סוג התחרות: {eventType}
              </div>

              <div style={{ fontSize: "20px", lineHeight: 1.8 }}>
                מסגרת התחרות: {eventCompetition}
              </div>

              <div style={{ fontSize: "20px", lineHeight: 1.8 }}>
                מיקום: {eventItem.location}
              </div>

              <div style={{ fontSize: "20px", lineHeight: 1.8 }}>
                תאריך ושעה: {eventItem.dateTime}
              </div>

              <div style={{ fontSize: "20px", lineHeight: 1.8 }}>
                מרחק מהמגרש: {distanceFromField}
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "22px", fontWeight: 800 }}>
                מושב שעליו עומד העכבר
              </div>

              {!hoveredSeat ? (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "19px",
                    color: "rgba(255,255,255,0.88)",
                    lineHeight: 1.8,
                  }}
                >
                  העבר את העכבר על מושב במפה כדי לראות פרטים.
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "16px",
                    borderRadius: "14px",
                    background: "rgba(44,115,255,0.22)",
                    border: "1px solid rgba(132,176,255,0.22)",
                    fontSize: "20px",
                    fontWeight: 700,
                    lineHeight: 1.8,
                  }}
                >
                  <div>{hoveredSeat.label}</div>
                  <div>מחיר: {hoveredSeat.price} ₪</div>
                  <div>
                    סטטוס: {hoveredSeat.status === "sold" ? "תפוס" : "פנוי לבחירה"}
                  </div>
                </div>
              )}
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "22px", fontWeight: 800 }}>
                המושבים שנבחרו
              </div>

              {selectedSeatsDetailed.length === 0 ? (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "19px",
                    color: "rgba(255,255,255,0.88)",
                    lineHeight: 1.8,
                  }}
                >
                  עדיין לא נבחרו מושבים.
                </div>
              ) : (
                <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                  {selectedSeatsDetailed.map((seat) => (
                    <div
                      key={seat.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "14px",
                        background: "rgba(46,177,94,0.28)",
                        border: "1px solid rgba(163,238,183,0.25)",
                        fontSize: "19px",
                        fontWeight: 700,
                        lineHeight: 1.7,
                      }}
                    >
                      {seat.label} | {seat.price} ₪
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={infoBoxStyle({ display: "grid", gap: "12px", fontSize: "20px" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span>כרטיסים שנבחרו</span>
                <strong>{selectedSeatIds.length}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span>כמות רצויה</span>
                <strong>{desiredTicketCount || "לא הוגדרה"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span>סה"כ משוער</span>
                <strong>{totalPrice} ₪</strong>
              </div>
            </div>

            <div style={infoBoxStyle()}>
              <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "12px" }}>
                נגישות ליציעים
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                {accessibilityItems.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      fontSize: "18px",
                      lineHeight: 1.8,
                      padding: "10px 12px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.08)",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section style={glassCardStyle({ padding: "34px" })}>
          <h2 style={{ margin: 0, fontSize: "40px", fontWeight: 800 }}>
            שמירת בקשה לרשימת ההמתנה
          </h2>

          <p
            style={{
              margin: "14px 0 0",
              fontSize: "24px",
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.94)",
            }}
          >
            ההצטרפות לרשימת ההמתנה אינה דורשת הזנת אשראי. ניתן לבחור עד 3 כרטיסים. תשלום יתבצע רק אם תתקבל הצעת רכישה מתוך רשימת ההמתנה.
          </p>

          <div
            style={{
              marginTop: "24px",
              ...infoBoxStyle({
                background: "rgba(44,115,255,0.18)",
                border: "1px solid rgba(132,176,255,0.28)",
              }),
            }}
          >
            <div style={{ fontSize: "26px", fontWeight: 800, marginBottom: "10px" }}>
              אין צורך בהזנת אשראי בשלב ההצטרפות
            </div>
            <div style={{ fontSize: "22px", lineHeight: 1.8, color: "rgba(255,255,255,0.94)" }}>
              הבקשה תישמר בתור רשימת ההמתנה בלבד. אם יתפנו מושבים מתאימים, תישלח אליך התראה באתר, במייל וב-SMS, ואז יעמדו לרשותך 90 דקות להשלים תשלום.
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              ...infoBoxStyle(),
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                cursor: "pointer",
                fontSize: "22px",
                fontWeight: 800,
              }}
            >
              <input
                type="checkbox"
                checked={isBundleApproved}
                onChange={(e) => {
                  setIsBundleApproved(e.target.checked);
                  clearMessage();
                }}
                style={{ width: "22px", height: "22px" }}
              />
              אני מאשר התחייבות לרכישת כל הכרטיסים כמקשה אחת במקרה של התאמה
            </label>
          </div>

          <div
            style={{
              marginTop: "28px",
              display: "grid",
              gap: "14px",
              justifyItems: "center",
            }}
          >
            {pageMessage && (
              <div
                style={{
                  width: "100%",
                  maxWidth: "820px",
                  padding: "16px 18px",
                  borderRadius: "16px",
                  fontSize: "22px",
                  fontWeight: 700,
                  textAlign: "center",
                  background:
                    messageType === "error"
                      ? "rgba(239,68,68,0.18)"
                      : "rgba(44,115,255,0.18)",
                  border:
                    messageType === "error"
                      ? "1px solid rgba(239,68,68,0.30)"
                      : "1px solid rgba(44,115,255,0.30)",
                  color: "#ffffff",
                }}
              >
                {pageMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                height: "68px",
                minWidth: "320px",
                border: "none",
                borderRadius: "16px",
                background: "#2c73ff",
                color: "#ffffff",
                fontSize: "28px",
                fontWeight: 800,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "שומר בקשה..." : "שמור בקשה לרשימת המתנה"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}