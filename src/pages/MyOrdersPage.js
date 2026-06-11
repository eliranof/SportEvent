import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./MyOrdersPage.css";
import homeBg from "../assets/img/homepage2.png";
import { fetchJsonWithFallback } from "../utils/apiRequest";
import { getEventById } from "../services/eventsService";
import {
  markEventSeatLabelsAsAvailable,
  syncEventInventoryFromServer,
} from "../services/seatSimulationService";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getLoggedInUser() {
  const sessionUser = safeParse(sessionStorage.getItem("user"));
  const localUser = safeParse(localStorage.getItem("user"));

  return sessionUser || localUser || null;
}

function formatValue(value, fallback = "לא צוין") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return value;
}

function formatHotelStars(value) {
  if (!value) {
    return "לא צוין";
  }

  return `${value} כוכבים`;
}

function hasTravelPackage(order) {
  return Boolean(
    order.package_title ||
      order.hotel_name ||
      order.hotel_stars ||
      order.room_type ||
      order.flight_label ||
      order.airline ||
      order.outbound_flight ||
      order.return_flight ||
      order.nights
  );
}

function translateStatus(status) {
  if (status === "paid" || status === "הוזמן בהצלחה") {
    return "שולם";
  }

  if (status === "pending_payment") {
    return "ממתין לתשלום";
  }

  if (status === "expired") {
    return "פג תוקף";
  }

  if (status === "cancelled") {
    return "בוטל";
  }

  return status || "לא ידוע";
}

function translatePaymentMethod(value) {
  if (!value) {
    return "לא צוין";
  }

  if (value === "credit_card") {
    return "כרטיס אשראי";
  }

  if (value === "digital_wallet") {
    return "ארנק דיגיטלי";
  }

  if (value.startsWith("digital_wallet:")) {
    const provider = value.split(":")[1] || "";

    if (provider === "google_pay") {
      return "Google Pay";
    }

    if (provider === "apple_pay") {
      return "Apple Pay";
    }

    if (provider === "paypal") {
      return "PayPal";
    }

    if (provider === "bit") {
      return "Bit";
    }

    return "ארנק דיגיטלי";
  }

  return value;
}

function getRemainingText(value) {
  if (!value) {
    return "לא צוין";
  }

  const expiresAt = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(expiresAt.getTime())) {
    return value;
  }

  const diff = expiresAt.getTime() - Date.now();

  if (diff <= 0) {
    return "פג תוקף";
  }

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} שעות ו-${minutes} דקות`;
  }

  return `${minutes} דקות`;
}

function getQrImageUrl(order) {
  const qrData = order.qr_value || order.ticket_code || order.order_code || "";

  return qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
        qrData
      )}`
    : "";
}

function getCancellationPolicy(order) {
  return order?.cancellation_policy || null;
}

function buildCancellationConfirmText(order) {
  const policy = getCancellationPolicy(order);

  return [
    `לבטל את ההזמנה ${formatValue(order.order_code)}?`,
    policy?.stage_label ? `מסלול ביטול: ${policy.stage_label}` : "",
    policy?.refund_amount ? `סכום זיכוי: ${policy.refund_amount}` : "",
    policy?.fee_amount ? `דמי ביטול: ${policy.fee_amount}` : "",
    policy?.message ? policy.message : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFallbackEvent(order) {
  return {
    id: order.event_id,
    location: order.location,
    price: order.price,
    category: order.category,
    competition: order.competition,
  };
}

function isPaidOrder(order) {
  return order.status === "paid" || order.status === "הוזמן בהצלחה";
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const loadOrders = useCallback(async (activeUser) => {
    if (!activeUser) {
      setOrders([]);
      return;
    }

    const userId = activeUser.id || 0;
    const email = activeUser.email || "";

    const { data } = await fetchJsonWithFallback(
      `get_orders.php?user_id=${userId}&email=${encodeURIComponent(email)}`
    );

    if (!data?.success) {
      throw new Error(data?.message || "לא ניתן לטעון את ההזמנות");
    }

    const fetchedOrders = Array.isArray(data.orders) ? data.orders : [];
    setOrders(fetchedOrders);
  }, []);

  useEffect(() => {
    const savedUser = getLoggedInUser();

    if (!savedUser) {
      setUser(null);
      setOrders([]);
      setLoading(false);
      return;
    }

    setUser(savedUser);

    loadOrders(savedUser)
      .catch((error) => {
        const serverMessage = error?.message || "שגיאה בטעינת ההזמנות";
        const failedUrl = error?.url ? ` | ${error.url}` : "";
        setErrorMessage(serverMessage + failedUrl);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadOrders]);

  const selectedOrderId = searchParams.get("orderId") || "";

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.id) === String(selectedOrderId)) || null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    if (selectedOrderId && !loading && orders.length > 0 && !selectedOrder) {
      setSearchParams({});
    }
  }, [loading, orders, selectedOrder, selectedOrderId, setSearchParams]);

  const openOrderDetails = (orderId) => {
    setSearchParams({ orderId: String(orderId) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeOrderDetails = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelOrder = async (order) => {
    const policy = getCancellationPolicy(order);

    if (!policy?.can_cancel) {
      alert(policy?.message || "לא ניתן לבטל הזמנה זו לפי מדיניות הביטולים.");
      return;
    }

    const confirmed = window.confirm(buildCancellationConfirmText(order));

    if (!confirmed) {
      return;
    }

    setCancellingOrderId(order.id);
    setErrorMessage("");

    try {
      const { data } = await fetchJsonWithFallback("cancel_order.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: order.id,
          user_id: user?.id || 0,
          email: user?.email || "",
        }),
      });

      if (!data?.success) {
        throw new Error(data?.message || "ביטול ההזמנה נכשל");
      }

      const eventFromService = getEventById(order.event_id) || buildFallbackEvent(order);

      markEventSeatLabelsAsAvailable(eventFromService, order.selected_seats || "");
      await syncEventInventoryFromServer(eventFromService);

      await loadOrders(user);

      alert(data.message || "ההזמנה בוטלה בהצלחה");
    } catch (error) {
      const serverMessage = error?.message || "שגיאה בביטול ההזמנה";
      const failedUrl = error?.url ? ` | ${error.url}` : "";
      setErrorMessage(serverMessage + failedUrl);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const renderCancellationButton = (order) => {
    const isPaid = isPaidOrder(order);
    const isCancelled = order.status === "cancelled";

    if (!isPaid || isCancelled) {
      return null;
    }

    const cancellationPolicy = getCancellationPolicy(order);
    const canCancel = Boolean(cancellationPolicy?.can_cancel);
    const isCancelling = cancellingOrderId === order.id;

    return (
      <button
        type="button"
        className="orderRow__detailsButton"
        onClick={() => {
          if (canCancel) {
            handleCancelOrder(order);
            return;
          }

          alert(
            cancellationPolicy?.message ||
              "לא ניתן לבטל הזמנה זו לפי מדיניות הביטולים."
          );
        }}
        disabled={isCancelling}
        style={{
          background: canCancel
            ? "linear-gradient(135deg, #ef4444, #f97316)"
            : "linear-gradient(135deg, #6b7280, #4b5563)",
          boxShadow: canCancel
            ? "0 10px 22px rgba(239, 68, 68, 0.28)"
            : "none",
          cursor: canCancel ? "pointer" : "not-allowed",
          opacity: canCancel ? 1 : 0.85,
        }}
      >
        {isCancelling ? "מבטל הזמנה..." : canCancel ? "בטל הזמנה" : "לא ניתן לבטל"}
      </button>
    );
  };

  const paidOrdersCount = useMemo(
    () => orders.filter((order) => isPaidOrder(order)).length,
    [orders]
  );

  return (
    <div
      className="ordersPage"
      style={{ backgroundImage: `url(${homeBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="ordersPage__overlay" />

      <div className="ordersPage__container">
        <header className="ordersPage__topbar">
          <button
            type="button"
            className="ordersPage__backButton"
            onClick={() => navigate("/")}
          >
            חזרה לדף הבית
          </button>

          <div className="ordersPage__brand">SportEvent</div>
        </header>

        <section className="ordersPage__hero">
          <h1 className="ordersPage__title">סל ההזמנות שלי</h1>

          {!user ? (
            <p className="ordersPage__subtitle">
              כדי לצפות בהזמנות שלך יש להתחבר למערכת.
            </p>
          ) : (
            <p className="ordersPage__subtitle">
              שלום {user.username || user.fullName || user.full_name}, כאן יוצגו כל
              ההזמנות, כולל סטטוס תשלום, כרטיס דיגיטלי, QR ומדיניות ביטולים.
            </p>
          )}
        </section>

        {!user ? (
          <section className="ordersPage__stateCard">
            <p className="ordersPage__stateText">
              יש להתחבר למערכת כדי לראות את ההזמנות שלך.
            </p>

            <div className="ordersPage__stateActions">
              <button
                type="button"
                className="ordersPage__primaryButton"
                onClick={() => navigate("/login")}
              >
                התחברות
              </button>

              <button
                type="button"
                className="ordersPage__secondaryButton"
                onClick={() => navigate("/register")}
              >
                הרשמה
              </button>
            </div>
          </section>
        ) : loading ? (
          <section className="ordersPage__stateCard">
            <p className="ordersPage__stateText">טוען הזמנות...</p>
          </section>
        ) : errorMessage ? (
          <section className="ordersPage__stateCard">
            <p className="ordersPage__stateText">{errorMessage}</p>
          </section>
        ) : orders.length === 0 ? (
          <section className="ordersPage__stateCard">
            <div className="ordersPage__emptyIcon">🛒</div>

            <h2 className="ordersPage__emptyTitle">עדיין אין הזמנות להצגה</h2>

            <p className="ordersPage__stateText">
              לאחר ביצוע רכישה, ההזמנות שלך יופיעו כאן.
            </p>

            <div className="ordersPage__stateActions">
              <button
                type="button"
                className="ordersPage__primaryButton"
                onClick={() => navigate("/events/near")}
              >
                מעבר לאירועים קרובים
              </button>

              <button
                type="button"
                className="ordersPage__secondaryButton"
                onClick={() => navigate("/events/must-see")}
              >
                מעבר לאירועים שאסור לפספס
              </button>
            </div>
          </section>
        ) : (
          <>
            <div
              className="ordersPage__summaryBar"
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
            >
              <div className="ordersPage__summaryChip">
                סה"כ הזמנות: <strong>{orders.length}</strong>
              </div>

              <div className="ordersPage__summaryChip">
                הזמנות ששולמו: <strong>{paidOrdersCount}</strong>
              </div>
            </div>

            {selectedOrder ? (
              <section className="orderDetailsPage">
                <div className="orderDetailsPage__header">
                  <button
                    type="button"
                    className="ordersPage__secondaryButton"
                    onClick={closeOrderDetails}
                  >
                    חזרה לכל ההזמנות
                  </button>

                  <div className="orderDetailsPage__titleWrap">
                    <h2 className="orderDetailsPage__title">
                      {formatValue(selectedOrder.event_name)}
                    </h2>

                    <div className="orderDetailsPage__subtitle">
                      קוד הזמנה: {formatValue(selectedOrder.order_code)}
                    </div>
                  </div>
                </div>

                {(() => {
                  const order = selectedOrder;
                  const hasPackage = hasTravelPackage(order);
                  const qrImageUrl = getQrImageUrl(order);
                  const isPaid = isPaidOrder(order);
                  const isPending = order.status === "pending_payment";
                  const isCancelled = order.status === "cancelled";
                  const cancellationPolicy = getCancellationPolicy(order);

                  return (
                    <div className="orderRow__details orderRow__details--page">
                      <div className="orderDetailsSection orderDetailsSection--event">
                        <h3 className="orderDetailsSection__title">
                          פרטי האירוע והתשלום
                        </h3>

                        <div className="orderDetailsGrid">
                          <div className="orderDetailsField orderDetailsField--blue">
                            <span className="orderDetailsField__label">
                              סוג התחרות
                            </span>
                            <span className="orderDetailsField__value">
                              {formatValue(order.category)}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--purple">
                            <span className="orderDetailsField__label">
                              מסגרת התחרות
                            </span>
                            <span className="orderDetailsField__value">
                              {formatValue(order.competition)}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--teal">
                            <span className="orderDetailsField__label">מיקום</span>
                            <span className="orderDetailsField__value">
                              {formatValue(order.location)}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--orange">
                            <span className="orderDetailsField__label">
                              כמות כרטיסים
                            </span>
                            <span className="orderDetailsField__value">
                              {formatValue(order.tickets_count)}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--pink">
                            <span className="orderDetailsField__label">
                              אמצעי תשלום
                            </span>
                            <span className="orderDetailsField__value">
                              {translatePaymentMethod(order.payment_method)}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--blue">
                            <span className="orderDetailsField__label">
                              תוקף הזמנה זמנית
                            </span>
                            <span className="orderDetailsField__value">
                              {isPending
                                ? getRemainingText(order.hold_expires_at)
                                : formatValue(
                                    order.hold_expires_at,
                                    "הסתיים לאחר תשלום"
                                  )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="orderDetailsSection orderDetailsSection--seats">
                        <h3 className="orderDetailsSection__title">מושבים</h3>
                        <div className="orderDetailsSeatBox">
                          {formatValue(order.selected_seats)}
                        </div>
                      </div>

                      <div
                        className="orderDetailsSection"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(99, 102, 241, 0.14))",
                        }}
                      >
                        <h3 className="orderDetailsSection__title">
                          מדיניות ביטולים
                        </h3>

                        <div className="orderDetailsGrid">
                          <div className="orderDetailsField orderDetailsField--blue">
                            <span className="orderDetailsField__label">
                              חלון הביטול
                            </span>
                            <span className="orderDetailsField__value">
                              {formatValue(
                                order.cancellation_window_label ||
                                  cancellationPolicy?.stage_label,
                                "טרם חושב"
                              )}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--teal">
                            <span className="orderDetailsField__label">
                              זמן עד האירוע
                            </span>
                            <span className="orderDetailsField__value">
                              {formatValue(
                                cancellationPolicy?.time_until_event_label,
                                "לא זמין"
                              )}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--purple">
                            <span className="orderDetailsField__label">
                              זיכוי צפוי
                            </span>
                            <span className="orderDetailsField__value">
                              {formatValue(
                                order.refund_amount ||
                                  cancellationPolicy?.refund_amount,
                                "0"
                              )}
                            </span>
                          </div>

                          <div className="orderDetailsField orderDetailsField--orange">
                            <span className="orderDetailsField__label">
                              דמי ביטול
                            </span>
                            <span className="orderDetailsField__value">
                              {formatValue(
                                order.cancel_fee_amount ||
                                  cancellationPolicy?.fee_amount,
                                "0"
                              )}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 16,
                            padding: 18,
                            borderRadius: 18,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.14)",
                            color: "#ffffff",
                            fontSize: 21,
                            lineHeight: 1.8,
                            fontWeight: 700,
                          }}
                        >
                          {formatValue(
                            cancellationPolicy?.message,
                            "המדיניות תחושב לפי תאריך האירוע בעת הביטול"
                          )}
                        </div>

                        {isCancelled && (
                          <div
                            style={{
                              marginTop: 16,
                              padding: 18,
                              borderRadius: 18,
                              background: "rgba(34, 197, 94, 0.16)",
                              border: "1px solid rgba(34, 197, 94, 0.28)",
                              color: "#ffffff",
                              fontSize: 21,
                              lineHeight: 1.8,
                              fontWeight: 800,
                            }}
                          >
                            ההזמנה בוטלה בתאריך {formatValue(order.cancelled_at)}.
                            הזיכוי שנרשם: {formatValue(order.refund_amount, "0")}.
                            דמי הביטול שנרשמו:{" "}
                            {formatValue(order.cancel_fee_amount, "0")}.
                          </div>
                        )}
                      </div>

                      {isPaid && !isCancelled && (
                        <div
                          className="orderDetailsSection"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(0, 184, 148, 0.22), rgba(37, 99, 235, 0.16))",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <h3 className="orderDetailsSection__title">
                              כרטיס דיגיטלי
                            </h3>

                            {renderCancellationButton(order)}
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.3fr 220px",
                              gap: 20,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                borderRadius: 22,
                                padding: 22,
                                border: "1px solid rgba(255,255,255,0.14)",
                              }}
                            >
                              <div
                                style={{
                                  color: "#fff",
                                  fontSize: 30,
                                  fontWeight: 900,
                                  marginBottom: 14,
                                }}
                              >
                                {formatValue(order.event_name)}
                              </div>

                              <div
                                style={{ color: "#fff", fontSize: 22, lineHeight: 1.8 }}
                              >
                                קוד כרטיס:{" "}
                                <strong>{formatValue(order.ticket_code)}</strong>
                              </div>

                              <div
                                style={{ color: "#fff", fontSize: 22, lineHeight: 1.8 }}
                              >
                                קוד הזמנה:{" "}
                                <strong>{formatValue(order.order_code)}</strong>
                              </div>

                              <div
                                style={{ color: "#fff", fontSize: 22, lineHeight: 1.8 }}
                              >
                                כניסה דיגיטלית: <strong>פעילה</strong>
                              </div>

                              <div
                                style={{
                                  color: "rgba(255,255,255,0.92)",
                                  fontSize: 20,
                                  marginTop: 12,
                                }}
                              >
                                לאחר ההגעה לאירוע ניתן להציג את ה-QR מהטלפון או
                                מהמחשב.
                              </div>
                            </div>

                            <div
                              style={{
                                background: "#ffffff",
                                borderRadius: 18,
                                padding: 12,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: 204,
                              }}
                            >
                              {qrImageUrl ? (
                                <img
                                  src={qrImageUrl}
                                  alt={`QR עבור הזמנה ${order.order_code}`}
                                  style={{
                                    width: 180,
                                    height: 180,
                                    objectFit: "contain",
                                  }}
                                />
                              ) : (
                                <div style={{ color: "#111827", fontWeight: 800 }}>
                                  QR לא זמין
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {hasPackage && (
                        <div className="orderDetailsSection orderDetailsSection--travel">
                          <h3 className="orderDetailsSection__title">
                            חבילת תיירות
                          </h3>

                          <div className="orderDetailsGrid">
                            <div className="orderDetailsField orderDetailsField--pink">
                              <span className="orderDetailsField__label">חבילה</span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.package_title)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--teal">
                              <span className="orderDetailsField__label">מלון</span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.hotel_name)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--orange">
                              <span className="orderDetailsField__label">
                                דירוג מלון
                              </span>
                              <span className="orderDetailsField__value">
                                {formatHotelStars(order.hotel_stars)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--purple">
                              <span className="orderDetailsField__label">
                                סוג חדר
                              </span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.room_type)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--blue">
                              <span className="orderDetailsField__label">טיסה</span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.flight_label)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--pink">
                              <span className="orderDetailsField__label">
                                חברת תעופה
                              </span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.airline)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--teal">
                              <span className="orderDetailsField__label">
                                טיסת הלוך
                              </span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.outbound_flight)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--orange">
                              <span className="orderDetailsField__label">
                                טיסת חזור
                              </span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.return_flight)}
                              </span>
                            </div>

                            <div className="orderDetailsField orderDetailsField--purple">
                              <span className="orderDetailsField__label">
                                מספר לילות
                              </span>
                              <span className="orderDetailsField__value">
                                {formatValue(order.nights)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </section>
            ) : (
              <section className="ordersList">
                {orders.map((order) => {
                  return (
                    <article key={order.id} className="orderRow orderRow--compact">
                      <button
                        type="button"
                        className="orderRow__summary orderRow__summary--compact"
                        onClick={() => openOrderDetails(order.id)}
                      >
                        <div className="orderRow__main">
                          <div className="orderRow__eventName">
                            {formatValue(order.event_name)}
                          </div>

                          <div className="orderRow__orderCode">
                            {formatValue(order.order_code)}
                          </div>
                        </div>

                        <div className="orderRow__compactInfo">
                          <span className="orderRow__compactItem">
                            תאריך האירוע: {formatValue(order.date_time)}
                          </span>

                          <span className="orderRow__compactItem">
                            מחיר: {formatValue(order.price)}
                          </span>

                          <span className="orderRow__compactItem orderRow__compactItem--status">
                            סטטוס: {translateStatus(order.status)}
                          </span>
                        </div>

                        <div className="orderRow__arrow">◀</div>
                      </button>

                      <div className="orderRow__actions orderRow__actions--compact">
                        {renderCancellationButton(order)}

                        <button
                          type="button"
                          className="orderRow__detailsButton"
                          onClick={() => openOrderDetails(order.id)}
                        >
                          לפרטי ההזמנה
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}