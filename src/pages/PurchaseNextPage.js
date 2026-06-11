import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PurchaseTicketsPage.css";
import purchaseBg from "../assets/img/purchasetickes.png";
import { fetchJsonWithFallback } from "../utils/apiRequest";
import {
  markEventSeatsAsSold,
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

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function toIsoDateString(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function getRemainingSecondsFromDate(value) {
  if (!value) {
    return 0;
  }

  const expiresAt = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(expiresAt.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}

function parsePriceNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  return Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
}

function buildHoldKey(user, eventItem, travelPackage, purchaseSource, waitlistRequestId) {
  const seatPart = Array.isArray(eventItem?.selectedSeatIds)
    ? eventItem.selectedSeatIds.join("|")
    : Array.isArray(eventItem?.selectedSeats)
    ? eventItem.selectedSeats.join("|")
    : "";

  return [
    purchaseSource || "regular",
    user?.id || "0",
    eventItem?.id || eventItem?.event_id || "",
    seatPart,
    travelPackage?.packageTitle || "",
    waitlistRequestId || "",
  ].join("::");
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
    const provider = value.split(":")[1] || "digital_wallet";

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

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PurchaseNextPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedEvent = location.state?.selectedEvent || null;
  const profileFromState = location.state?.profile || null;
  const selectedTravelPackage = selectedEvent?.travelPackage || null;
  const initialTemporaryOrderId = location.state?.temporaryOrderId || null;
  const initialHoldExpiresAt = location.state?.holdExpiresAt || "";
  const purchaseSource =
    location.state?.purchaseSource || selectedEvent?.purchaseSource || "regular";
  const waitlistRequestId = location.state?.waitlistRequestId || null;

  const [cardNumber, setCardNumber] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [walletProvider, setWalletProvider] = useState("google_pay");
  const [walletEmail, setWalletEmail] = useState("");
  const [walletPassword, setWalletPassword] = useState("");
  const [showWalletPassword, setShowWalletPassword] = useState(false);

  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [temporaryOrderId, setTemporaryOrderId] = useState(initialTemporaryOrderId);
  const [holdExpiresAt, setHoldExpiresAt] = useState(initialHoldExpiresAt);
  const [remainingSeconds, setRemainingSeconds] = useState(
    getRemainingSecondsFromDate(initialHoldExpiresAt)
  );

  const [preparingOrder, setPreparingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const createOrderRequestedRef = useRef(false);

  const currentUser = useMemo(() => getLoggedInUser(), []);

  const profileData = useMemo(() => {
    return {
      username:
        currentUser?.username ||
        profileFromState?.username ||
        profileFromState?.fullName ||
        currentUser?.fullName ||
        currentUser?.full_name ||
        "",
      email: currentUser?.email || profileFromState?.email || "",
      fullName:
        currentUser?.fullName ||
        currentUser?.full_name ||
        profileFromState?.fullName ||
        "",
    };
  }, [currentUser, profileFromState]);

  const packageOnlyPrice = useMemo(() => {
    return Number(
      selectedTravelPackage?.packageOnlyPrice || selectedEvent?.packageOnlyPrice || 0
    );
  }, [selectedEvent, selectedTravelPackage]);

  const ticketOnlyPrice = useMemo(() => {
    return Number(selectedEvent?.ticketOnlyPrice || 0);
  }, [selectedEvent]);

  const totalPriceNumber = useMemo(() => {
    if (selectedEvent?.totalPriceNumber) {
      return Number(selectedEvent.totalPriceNumber);
    }

    return parsePriceNumber(selectedEvent?.totalPrice || selectedEvent?.price);
  }, [selectedEvent]);

  const installmentAmount = useMemo(() => {
    const count = Number(installmentsCount) || 1;
    return totalPriceNumber / count;
  }, [installmentsCount, totalPriceNumber]);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (!selectedEvent) {
      navigate("/events/near");
    }
  }, [currentUser, navigate, selectedEvent]);

  useEffect(() => {
    if (!holdExpiresAt) {
      setRemainingSeconds(0);
      return undefined;
    }

    setRemainingSeconds(getRemainingSecondsFromDate(holdExpiresAt));

    const timer = window.setInterval(() => {
      setRemainingSeconds(getRemainingSecondsFromDate(holdExpiresAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [holdExpiresAt]);

  useEffect(() => {
    if (
      !selectedEvent ||
      !currentUser ||
      initialTemporaryOrderId ||
      createOrderRequestedRef.current
    ) {
      return;
    }

    createOrderRequestedRef.current = true;
    setPreparingOrder(true);
    setErrorMessage("");

    const requestBody = {
      user_id: currentUser.id,
      username: currentUser.username || profileData.username || "",
      email: currentUser.email || profileData.email || "",
      full_name:
        currentUser.fullName || currentUser.full_name || profileData.fullName || "",
      event_id: selectedEvent.id || selectedEvent.event_id || "",
      event_name:
        selectedEvent.teams || selectedEvent.title || selectedEvent.event_name || "",
      location: selectedEvent.location || "",
      date_time: selectedEvent.dateTime || selectedEvent.date_time || "",
      category: selectedEvent.category || selectedEvent.tag || "אירוע",
      competition: selectedEvent.competition || "",
      tickets_count: selectedEvent.ticketsCount || 1,
      selected_seats:
        Array.isArray(selectedEvent.selectedSeats) &&
        selectedEvent.selectedSeats.length > 0
          ? selectedEvent.selectedSeats.join(" | ")
          : "",
      price: selectedEvent.totalPrice || selectedEvent.price || "",
      package_title: selectedTravelPackage?.packageTitle || "",
      hotel_name: selectedTravelPackage?.hotelName || "",
      hotel_stars: selectedTravelPackage?.hotelStars || "",
      room_type: selectedTravelPackage?.roomTypeLabel || "",
      flight_label: selectedTravelPackage?.flightLabel || "",
      airline: selectedTravelPackage?.airline || "",
      outbound_flight: selectedTravelPackage?.outbound || "",
      return_flight: selectedTravelPackage?.inbound || "",
      nights: selectedTravelPackage?.nights || "",
      purchase_source: purchaseSource,
      waitlist_request_id: waitlistRequestId,
      hold_key: buildHoldKey(
        currentUser,
        selectedEvent,
        selectedTravelPackage,
        purchaseSource,
        waitlistRequestId
      ),
    };

    fetchJsonWithFallback("save_order.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
      .then(({ data }) => {
        if (!data?.success) {
          setErrorMessage(data?.message || "יצירת הזמנה זמנית נכשלה");
          return;
        }

        setTemporaryOrderId(data.order_id || null);
        setHoldExpiresAt(data.hold_expires_at || "");
      })
      .catch((error) => {
        const serverMessage = error?.message || "שגיאה בחיבור לשרת";
        const failedUrl = error?.url ? ` | ${error.url}` : "";
        setErrorMessage(serverMessage + failedUrl);
      })
      .finally(() => {
        setPreparingOrder(false);
      });
  }, [
    currentUser,
    initialTemporaryOrderId,
    profileData.email,
    profileData.fullName,
    profileData.username,
    purchaseSource,
    selectedEvent,
    selectedTravelPackage,
    waitlistRequestId,
  ]);

  const isExpired = remainingSeconds <= 0 && Boolean(holdExpiresAt);

  const handleCardNumberChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(digits);
    setErrorMessage("");
  };

  const handleOwnerIdChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    setOwnerId(digits);
    setErrorMessage("");
  };

  const handleExpiryDateChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);

    if (digits.length <= 2) {
      setExpiryDate(digits);
    } else {
      setExpiryDate(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }

    setErrorMessage("");
  };

  const handleCvvChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    setCvv(digits);
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!temporaryOrderId) {
      setErrorMessage("ההזמנה הזמנית עדיין לא נוצרה. המתן מספר שניות ונסה שוב");
      return;
    }

    if (isExpired) {
      setErrorMessage("פג הזמן המוקצב להזמנה הזמנית. יש להתחיל רכישה מחדש");
      return;
    }

    if (paymentMethod === "credit_card") {
      if (!cardNumber.trim() || !ownerId.trim() || !expiryDate.trim() || !cvv.trim()) {
        setErrorMessage("לא כל פרטי האשראי מולאו");
        return;
      }

      if (cardNumber.length < 8 || cardNumber.length > 16) {
        setErrorMessage("מספר כרטיס האשראי חייב להכיל בין 8 ל-16 ספרות");
        return;
      }

      if (ownerId.length !== 9) {
        setErrorMessage("תעודת הזהות חייבת להכיל 9 ספרות");
        return;
      }

      if (expiryDate.length !== 5) {
        setErrorMessage("יש להזין תוקף בפורמט MM/YY");
        return;
      }

      if (cvv.length !== 3) {
        setErrorMessage("קוד CVV חייב להכיל 3 ספרות");
        return;
      }
    }

    if (paymentMethod === "digital_wallet") {
      const cleanWalletEmail = walletEmail.trim();
      const cleanWalletPassword = walletPassword.trim();

      if (!walletProvider) {
        setErrorMessage("יש לבחור סוג ארנק דיגיטלי");
        return;
      }

      if (!cleanWalletEmail) {
        setErrorMessage("יש להזין אימייל של הארנק הדיגיטלי");
        return;
      }

      if (!validateEmail(cleanWalletEmail)) {
        setErrorMessage("אימייל הארנק הדיגיטלי אינו תקין");
        return;
      }

      if (!cleanWalletPassword) {
        setErrorMessage("יש להזין סיסמת ארנק דיגיטלי");
        return;
      }

      if (cleanWalletPassword.length < 6) {
        setErrorMessage("סיסמת הארנק הדיגיטלי חייבת להכיל לפחות 6 תווים");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await fetchJsonWithFallback("complete_order_payment.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: temporaryOrderId,
          payment_method: paymentMethod,
          wallet_provider: walletProvider,
          wallet_email: walletEmail.trim(),
          wallet_password: walletPassword.trim(),
          card_number: cardNumber,
          owner_id: ownerId,
          expiry_date: expiryDate,
          cvv,
          installments_count: Number(installmentsCount) || 1,
        }),
      });

      if (!data?.success) {
        setErrorMessage(data?.message || "השלמת התשלום נכשלה");
        setIsSubmitting(false);
        return;
      }

      const purchasedSeatReferences =
        Array.isArray(selectedEvent?.selectedSeatIds) &&
        selectedEvent.selectedSeatIds.length > 0
          ? selectedEvent.selectedSeatIds
          : Array.isArray(selectedEvent?.selectedSeats)
          ? selectedEvent.selectedSeats
          : [];

      if (purchasedSeatReferences.length > 0) {
        markEventSeatsAsSold(selectedEvent, purchasedSeatReferences);
      }

      await syncEventInventoryFromServer(selectedEvent);

      const paymentLabel =
        data.payment_method === "digital_wallet" && data.wallet_provider
          ? translatePaymentMethod(`digital_wallet:${data.wallet_provider}`)
          : translatePaymentMethod(data.payment_method || "");

      const finalMessage =
        `תשלום בוצע בהצלחה. מספר הזמנה: ${data.order_code || ""}. ` +
        `קוד כרטיס: ${data.ticket_code || ""}. ` +
        `אמצעי תשלום: ${paymentLabel}`;

      setSuccessMessage(finalMessage);
      alert(finalMessage);
      navigate("/my-orders");
    } catch (error) {
      const serverMessage = error?.message || "שגיאה בחיבור לשרת";
      const failedUrl = error?.url ? ` | ${error.url}` : "";
      setErrorMessage(serverMessage + failedUrl);
      setIsSubmitting(false);
    }
  };

  if (!selectedEvent) {
    return null;
  }

  return (
    <div
      className="purchase-page"
      style={{ backgroundImage: `url(${purchaseBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="purchase-page__overlay" />

      <div className="purchase-page__card">
        <div className="purchase-page__topActions purchase-page__topActions--center">
          <button
            type="button"
            className="purchase-page__topBtn"
            onClick={() => navigate("/")}
          >
            חזור לדף הבית
          </button>
        </div>

        <div className="purchase-page__header">
          <h1 className="purchase-page__title">בצע תשלום</h1>
          <p className="purchase-page__subtitle">
            ההזמנה נשמרה עבורך באופן זמני. ניתן לשלם בכרטיס אשראי או בארנק דיגיטלי.
          </p>
        </div>

        <div
          style={{
            background: "rgba(17, 24, 39, 0.36)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 18,
            padding: 20,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
            הזמן שנותר להשלמת הרכישה
          </div>

          <div
            style={{
              fontSize: 46,
              fontWeight: 900,
              color: isExpired ? "#ffd7d7" : "#d9ffe0",
            }}
          >
            {holdExpiresAt
              ? isExpired
                ? "פג תוקף"
                : formatCountdown(remainingSeconds)
              : "טוען..."}
          </div>

          <div style={{ fontSize: 19, marginTop: 10, color: "rgba(255,255,255,0.9)" }}>
            {purchaseSource === "waitlist"
              ? "זו רכישה מרשימת ההמתנה, ולכן גם חלון הזמן של ההצעה נשמר ברקע"
              : "הזמנה זמנית זו נשמרת ל-15 דקות במסלול הרכישה הרגיל"}
          </div>
        </div>

        <div className="purchase-page__form" style={{ marginBottom: 22 }}>
          <div className="purchase-page__field">
            <label className="purchase-page__label">אירוע</label>
            <input
              className="purchase-page__input"
              type="text"
              value={selectedEvent.teams || selectedEvent.title || ""}
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">מיקום</label>
            <input
              className="purchase-page__input"
              type="text"
              value={selectedEvent.location || ""}
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">תאריך ושעה</label>
            <input
              className="purchase-page__input"
              type="text"
              value={selectedEvent.dateTime || selectedEvent.date_time || ""}
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">מסגרת התחרות</label>
            <input
              className="purchase-page__input"
              type="text"
              value={selectedEvent.competition || ""}
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">כמות כרטיסים</label>
            <input
              className="purchase-page__input"
              type="text"
              value={selectedEvent.ticketsCount || 1}
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">מושבים</label>
            <input
              className="purchase-page__input"
              type="text"
              value={
                Array.isArray(selectedEvent.selectedSeats) &&
                selectedEvent.selectedSeats.length > 0
                  ? selectedEvent.selectedSeats.join(" | ")
                  : "לא נבחרו מושבים"
              }
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">חבילת נופש</label>
            <input
              className="purchase-page__input"
              type="text"
              value={selectedTravelPackage?.packageTitle || "ללא חבילה"}
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">מחיר כולל</label>
            <input
              className="purchase-page__input"
              type="text"
              value={`${totalPriceNumber.toLocaleString("he-IL")} ₪`}
              readOnly
            />
          </div>

          <div className="purchase-page__field">
            <label className="purchase-page__label">תוקף ההזמנה הזמנית</label>
            <input
              className="purchase-page__input"
              type="text"
              value={toIsoDateString(holdExpiresAt) ? holdExpiresAt : "טוען..."}
              readOnly
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("credit_card");
                setErrorMessage("");
              }}
              style={{
                minHeight: 78,
                borderRadius: 16,
                border:
                  paymentMethod === "credit_card"
                    ? "2px solid #60a5fa"
                    : "1px solid rgba(255,255,255,0.22)",
                background:
                  paymentMethod === "credit_card"
                    ? "rgba(37, 99, 235, 0.28)"
                    : "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              תשלום בכרטיס אשראי
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod("digital_wallet");
                setErrorMessage("");
              }}
              style={{
                minHeight: 78,
                borderRadius: 16,
                border:
                  paymentMethod === "digital_wallet"
                    ? "2px solid #60a5fa"
                    : "1px solid rgba(255,255,255,0.22)",
                background:
                  paymentMethod === "digital_wallet"
                    ? "rgba(37, 99, 235, 0.28)"
                    : "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              תשלום בארנק דיגיטלי
            </button>
          </div>

          {paymentMethod === "credit_card" ? (
            <div className="purchase-page__paymentForm">
              <div className="purchase-page__field">
                <label className="purchase-page__label">מספר כרטיס אשראי</label>
                <input
                  className="purchase-page__input"
                  type="password"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="8 עד 16 ספרות"
                  autoComplete="off"
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">תעודת זהות בעל הכרטיס</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={ownerId}
                  onChange={(e) => handleOwnerIdChange(e.target.value)}
                  placeholder="9 ספרות"
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">תוקף</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={expiryDate}
                  onChange={(e) => handleExpiryDateChange(e.target.value)}
                  placeholder="MM/YY"
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">3 ספרות בגב הכרטיס</label>
                <input
                  className="purchase-page__input"
                  type="password"
                  inputMode="numeric"
                  value={cvv}
                  onChange={(e) => handleCvvChange(e.target.value)}
                  placeholder="3 ספרות"
                  autoComplete="off"
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">מספר תשלומים</label>
                <select
                  className="purchase-page__input"
                  value={installmentsCount}
                  onChange={(e) => {
                    setInstallmentsCount(e.target.value);
                    setErrorMessage("");
                  }}
                >
                  <option value="1">תשלום אחד</option>
                  <option value="2">2 תשלומים</option>
                  <option value="3">3 תשלומים</option>
                  <option value="4">4 תשלומים</option>
                  <option value="5">5 תשלומים</option>
                  <option value="6">6 תשלומים</option>
                  <option value="12">12 תשלומים</option>
                </select>
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">סכום לכל תשלום</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value={`${installmentAmount.toLocaleString("he-IL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ₪`}
                  readOnly
                />
              </div>
            </div>
          ) : (
            <div className="purchase-page__paymentForm">
              <div className="purchase-page__field">
                <label className="purchase-page__label">בחר ארנק דיגיטלי</label>
                <select
                  className="purchase-page__input"
                  value={walletProvider}
                  onChange={(e) => {
                    setWalletProvider(e.target.value);
                    setErrorMessage("");
                  }}
                >
                  <option value="google_pay">Google Pay</option>
                  <option value="apple_pay">Apple Pay</option>
                  <option value="paypal">PayPal</option>
                  <option value="bit">Bit</option>
                </select>
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">אימייל הארנק הדיגיטלי</label>
                <input
                  className="purchase-page__input"
                  type="email"
                  value={walletEmail}
                  onChange={(e) => {
                    setWalletEmail(e.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="name@gmail.com"
                  autoComplete="off"
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">סיסמת ארנק דיגיטלי</label>
                <input
                  className="purchase-page__input"
                  type={showWalletPassword ? "text" : "password"}
                  value={walletPassword}
                  onChange={(e) => {
                    setWalletPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="סיסמת דמו לארנק הדיגיטלי"
                  autoComplete="new-password"
                />
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">הצגת סיסמה</label>
                <button
                  type="button"
                  className="purchase-page__input"
                  onClick={() => setShowWalletPassword((prev) => !prev)}
                  style={{
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {showWalletPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                </button>
              </div>

              <div className="purchase-page__field">
                <label className="purchase-page__label">אישור תשלום</label>
                <input
                  className="purchase-page__input"
                  type="text"
                  value="לאחר הזנת אימייל וסיסמה ניתן לבצע רכישה"
                  readOnly
                />
              </div>
            </div>
          )}

          {(preparingOrder || errorMessage || successMessage) && (
            <div
              className="purchase-page__formMessage"
              style={{ color: successMessage ? "#d9ffe0" : undefined }}
            >
              {preparingOrder ? "יוצר הזמנה זמנית..." : successMessage || errorMessage}
            </div>
          )}

          <div className="purchase-page__actions">
            <button
              type="button"
              className="purchase-page__btn purchase-page__btn--secondary"
              onClick={() => navigate(-1)}
            >
              חזרה
            </button>

            <button
              type="submit"
              className="purchase-page__btn purchase-page__btn--primary"
              disabled={preparingOrder || isSubmitting || isExpired}
            >
              {isSubmitting ? "מעבד תשלום..." : "בצע תשלום מאובטח"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}