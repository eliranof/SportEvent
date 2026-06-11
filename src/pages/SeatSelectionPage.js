import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getEventById } from "../services/eventsService";
import purchaseBg from "../assets/img/purchasetickes.png";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function parsePrice(value) {
  if (typeof value === "number") {
    return value;
  }

  return Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("he-IL")} ₪`;
}

function buildSeatsForSection(section) {
  const seats = [];

  for (let row = 1; row <= section.rows; row += 1) {
    for (let seat = 1; seat <= section.seatsPerRow; seat += 1) {
      const id = `${section.code}-${row}-${seat}`;

      seats.push({
        id,
        sectionCode: section.code,
        sectionTitle: section.title,
        rowNumber: row,
        seatNumber: seat,
        label: `${section.title} | שורה ${row} | כיסא ${seat}`,
        price: section.price,
      });
    }
  }

  return seats;
}

function buildSeatSections(eventItem) {
  const basePrice = parsePrice(eventItem?.baseTicketPrice || eventItem?.price || 450);

  const sections = [
    {
      code: "VIP",
      title: "יציע VIP",
      rows: 2,
      seatsPerRow: 5,
      price: basePrice + 350,
      color: "#a855f7",
    },
    {
      code: "W",
      title: "יציע מערבי",
      rows: 3,
      seatsPerRow: 6,
      price: basePrice + 140,
      color: "#2563eb",
    },
    {
      code: "E",
      title: "יציע מזרחי",
      rows: 3,
      seatsPerRow: 6,
      price: basePrice + 80,
      color: "#0ea5e9",
    },
    {
      code: "F",
      title: "יציע משפחות",
      rows: 2,
      seatsPerRow: 6,
      price: basePrice,
      color: "#16a34a",
    },
  ];

  return sections.map((section) => ({
    ...section,
    seats: buildSeatsForSection(section),
  }));
}

export default function SeatSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [pageMessage, setPageMessage] = useState("");
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [eventItem, setEventItem] = useState(() => location.state?.selectedEvent || null);
  const [seatSections, setSeatSections] = useState([]);

  useEffect(() => {
    if (location.state?.selectedEvent) {
      setEventItem(location.state.selectedEvent);
      return;
    }

    const fallbackEvent = getEventById(id);
    if (fallbackEvent) {
      setEventItem(fallbackEvent);
    }
  }, [id, location.state]);

  useEffect(() => {
    if (!eventItem) {
      return;
    }

    setSeatSections(buildSeatSections(eventItem));
    setSelectedSeatIds([]);
    setPageMessage("");
  }, [eventItem]);

  const allSeats = useMemo(() => {
    return seatSections.flatMap((section) => section.seats);
  }, [seatSections]);

  const selectedSeatsDetailed = useMemo(() => {
    return allSeats.filter((seat) => selectedSeatIds.includes(seat.id));
  }, [allSeats, selectedSeatIds]);

  const ticketOnlyPrice = useMemo(() => {
    return selectedSeatsDetailed.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
  }, [selectedSeatsDetailed]);

  const packageOnlyPrice = useMemo(() => {
    return Number(
      eventItem?.travelPackage?.packageOnlyPrice ||
        eventItem?.packageOnlyPrice ||
        0
    );
  }, [eventItem]);

  const grandTotalPrice = useMemo(() => {
    return ticketOnlyPrice + packageOnlyPrice;
  }, [ticketOnlyPrice, packageOnlyPrice]);

  if (!eventItem) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#071a3d",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "28px",
          fontWeight: 800,
        }}
      >
        לא נמצא אירוע לבחירת מושבים
      </div>
    );
  }

  const handleSeatClick = (seat) => {
    setPageMessage("");

    setSelectedSeatIds((prev) => {
      const exists = prev.includes(seat.id);

      if (exists) {
        return prev.filter((item) => item !== seat.id);
      }

      return [...prev, seat.id];
    });
  };

  const handleContinue = () => {
    if (!selectedSeatsDetailed.length) {
      setPageMessage("יש לבחור לפחות מושב אחד לפני מעבר לרכישה");
      return;
    }

    navigate("/purchase-tickets", {
      state: {
        selectedEvent: {
          ...eventItem,
          selectedSeats: selectedSeatsDetailed.map((seat) => seat.label),
          selectedSeatIds,
          selectedSeatsDetailed,
          ticketsCount: selectedSeatsDetailed.length,
          ticketOnlyPrice,
          ticketOnlyPriceText: formatPrice(ticketOnlyPrice),
          packageOnlyPrice,
          packageOnlyPriceText: formatPrice(packageOnlyPrice),
          totalPriceNumber: grandTotalPrice,
          totalPrice: formatPrice(grandTotalPrice),
          price: formatPrice(grandTotalPrice),
        },
      },
    });
  };

  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${purchaseBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          background: "rgba(7, 18, 44, 0.74)",
          padding: "28px 16px 40px",
        }}
      >
        <div
          style={{
            maxWidth: "1450px",
            margin: "0 auto",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                border: "none",
                borderRadius: "16px",
                padding: "12px 22px",
                background: "#2c73ff",
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              חזרה
            </button>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                fontWeight: 900,
                textAlign: "center",
                flex: "1 1 320px",
              }}
            >
              בחירת מושבים
            </h1>

            <div style={{ width: "110px" }} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
              gap: "22px",
              alignItems: "start",
            }}
          >
            <aside
              style={{
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.24)",
                borderRadius: "24px",
                padding: "28px",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: "14px",
                  fontSize: "32px",
                  fontWeight: 900,
                }}
              >
                {eventItem.title || eventItem.teams || "אירוע ספורט"}
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  fontSize: "20px",
                  lineHeight: 1.8,
                  marginBottom: "18px",
                }}
              >
                <div><strong>תחרות:</strong> {eventItem.competition || "לא צוין"}</div>
                <div><strong>קטגוריה:</strong> {eventItem.category || eventItem.tag || "לא צוין"}</div>
                <div><strong>מיקום:</strong> {eventItem.location || "לא צוין"}</div>
                <div><strong>תאריך ושעה:</strong> {eventItem.dateTime || eventItem.date_time || "לא צוין"}</div>
              </div>

              {eventItem.travelPackage ? (
                <div
                  style={{
                    marginBottom: "18px",
                    padding: "18px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "10px",
                      fontSize: "24px",
                      fontWeight: 900,
                    }}
                  >
                    חבילת הנופש שנבחרה
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "8px",
                      fontSize: "19px",
                      lineHeight: 1.8,
                    }}
                  >
                    <div><strong>חבילה:</strong> {eventItem.travelPackage.packageTitle || "לא צוין"}</div>
                    <div><strong>מלון:</strong> {eventItem.travelPackage.hotelName || "לא צוין"}</div>
                    <div><strong>חדר:</strong> {eventItem.travelPackage.roomTypeLabel || "לא צוין"}</div>
                    <div><strong>טיסה:</strong> {eventItem.travelPackage.flightLabel || "לא צוין"}</div>
                    <div><strong>מחיר חבילה:</strong> {formatPrice(packageOnlyPrice)}</div>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    fontSize: "20px",
                    lineHeight: 1.8,
                  }}
                >
                  <div><strong>מושבים שנבחרו:</strong></div>
                  {selectedSeatsDetailed.length ? (
                    <div style={{ marginTop: "8px" }}>
                      {selectedSeatsDetailed.map((seat) => seat.label).join(" | ")}
                    </div>
                  ) : (
                    <div style={{ marginTop: "8px" }}>עדיין לא נבחרו מושבים</div>
                  )}
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    fontSize: "20px",
                    lineHeight: 1.8,
                  }}
                >
                  <div><strong>מחיר כרטיסים:</strong> {formatPrice(ticketOnlyPrice)}</div>
                  <div><strong>מחיר חבילה:</strong> {formatPrice(packageOnlyPrice)}</div>
                  <div style={{ fontSize: "24px", fontWeight: 900, marginTop: "8px" }}>
                    <strong>סה"כ:</strong> {formatPrice(grandTotalPrice)}
                  </div>
                </div>
              </div>

              {pageMessage ? (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    background: "rgba(180, 0, 0, 0.30)",
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                >
                  {pageMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleContinue}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "16px",
                  padding: "15px 18px",
                  background: "#2c73ff",
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                המשך לסיכום רכישה
              </button>
            </aside>

            <section
              style={{
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.24)",
                borderRadius: "24px",
                padding: "28px",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: "18px",
                  fontSize: "34px",
                  fontWeight: 900,
                }}
              >
                מפת המושבים
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: "18px",
                }}
              >
                {seatSections.map((section) => (
                  <div
                    key={section.code}
                    style={{
                      borderRadius: "20px",
                      padding: "18px",
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: "8px",
                        fontSize: "26px",
                        fontWeight: 900,
                      }}
                    >
                      {section.title}
                    </div>

                    <div
                      style={{
                        marginBottom: "12px",
                        fontSize: "18px",
                        lineHeight: 1.7,
                      }}
                    >
                      מחיר לכל מושב: {formatPrice(section.price)}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${section.seatsPerRow}, minmax(36px, 1fr))`,
                        gap: "8px",
                      }}
                    >
                      {section.seats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat.id);

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            onClick={() => handleSeatClick(seat)}
                            title={`${seat.label} | ${formatPrice(seat.price)}`}
                            style={{
                              height: "42px",
                              borderRadius: "12px",
                              border: isSelected
                                ? "2px solid #ffffff"
                                : "1px solid rgba(255,255,255,0.22)",
                              background: isSelected ? "#16a34a" : section.color,
                              color: "#ffffff",
                              fontSize: "13px",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {seat.seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}