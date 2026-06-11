import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./OfferPurchasePage.css";
import { fetchJsonWithFallback } from "../utils/apiRequest";
import bg from "../assets/img/purchasetickes.png";

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function OfferPurchasePage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [offerData, setOfferData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadOffer = async () => {
      try {
        const { data } = await fetchJsonWithFallback(
          `get_waitlist_offer.php?request_id=${requestId}`
        );

        if (!data?.success) {
          if (isMounted) {
            const serverMessage = data?.message || "לא ניתן לטעון את ההצעה";
            const serverDetails = data?.details ? `: ${data.details}` : "";
            setErrorMessage(serverMessage + serverDetails);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setOfferData(data.offer || null);
          setRemainingSeconds(Number(data.remaining_seconds) || 0);
          setErrorMessage("");
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          const serverMessage = error?.message || "שגיאה בחיבור לשרת";
          const failedUrl = error?.url ? ` | ${error.url}` : "";
          setErrorMessage(serverMessage + failedUrl);
          setLoading(false);
        }
      }
    };

    loadOffer();

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  useEffect(() => {
    if (!remainingSeconds || remainingSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  const isExpired = useMemo(() => remainingSeconds <= 0, [remainingSeconds]);

  const seatsText = useMemo(() => {
    if (!offerData) {
      return "";
    }

    if (Array.isArray(offerData.offered_seats) && offerData.offered_seats.length > 0) {
      return offerData.offered_seats.join(" | ");
    }

    if (offerData.selection_mode === "zone") {
      return `יציע ${offerData.stand || "לא צוין"} | שורת העדפה ${
        offerData.preferred_row || "לא צוין"
      }`;
    }

    return "לא הוקצו מושבים";
  }, [offerData]);

  const handleCancelOffer = async () => {
    if (!offerData || isExpired || isCancelling) {
      return;
    }

    const approved = window.confirm(
      "האם לבטל את ההצעה? לאחר הביטול המושבים יעברו לממתין הבא בתור."
    );

    if (!approved) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage("");

    try {
      const { data } = await fetchJsonWithFallback("cancel_waitlist_request.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
          email: offerData.email || "",
          username: offerData.username || "",
        }),
      });

      if (!data?.success) {
        const serverMessage = data?.message || "ביטול ההצעה נכשל";
        const serverDetails = data?.details ? `: ${data.details}` : "";
        setErrorMessage(serverMessage + serverDetails);
        setIsCancelling(false);
        return;
      }

      navigate("/events/sold-out", {
        state: {
          waitlistMessage: data.message || "ההצעה בוטלה והועברה לממתין הבא בתור",
        },
      });
    } catch (error) {
      const serverMessage = error?.message || "שגיאה בחיבור לשרת";
      const failedUrl = error?.url ? ` | ${error.url}` : "";
      setErrorMessage(serverMessage + failedUrl);
      setIsCancelling(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!offerData || isExpired) {
      setErrorMessage("ההצעה אינה זמינה עוד והועברה לממתין הבא בתור");
      return;
    }

    setIsConfirming(true);
    setErrorMessage("");

    try {
      const { data } = await fetchJsonWithFallback("confirm_waitlist_purchase.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
        }),
      });

      if (!data?.success) {
        const serverMessage = data?.message || "אישור הרכישה נכשל";
        const serverDetails = data?.details ? `: ${data.details}` : "";
        setErrorMessage(serverMessage + serverDetails);
        setIsConfirming(false);
        return;
      }

      navigate("/purchase-tickets/next", {
        state: {
          selectedEvent: data.payment_event,
          temporaryOrderId: data.order_id,
          holdExpiresAt: data.hold_expires_at,
          purchaseSource: data.purchase_source || "waitlist",
          waitlistRequestId: data.waitlist_request_id || Number(requestId),
        },
      });
    } catch (error) {
      const serverMessage = error?.message || "שגיאה בחיבור לשרת";
      const failedUrl = error?.url ? ` | ${error.url}` : "";
      setErrorMessage(serverMessage + failedUrl);
      setIsConfirming(false);
    }
  };

  return (
    <div
      className="offerPurchase"
      style={{ backgroundImage: `url(${bg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="offerPurchase__overlay" />

      <div className="offerPurchase__card">
        <div className="offerPurchase__topActions">
          <button
            type="button"
            className="offerPurchase__topBtn"
            onClick={() => navigate("/")}
          >
            חזור לדף הבית
          </button>

          <button
            type="button"
            className="offerPurchase__topBtn"
            onClick={() => navigate("/my-orders")}
          >
            עבור לסל ההזמנות שלי
          </button>
        </div>

        <div className="offerPurchase__header">
          <h1 className="offerPurchase__title">הצעת רכישה מרשימת ההמתנה</h1>
          <p className="offerPurchase__subtitle">
            נמצא עבורך מקבץ מקומות מתאים. לאחר האישור תיווצר הזמנה זמנית ותועבר למסך תשלום מאובטח.
          </p>
        </div>

        {loading && (
          <div className="offerPurchase__messageBox">
            <p className="offerPurchase__message">טוען את פרטי ההצעה...</p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="offerPurchase__messageBox offerPurchase__messageBox--error">
            <p className="offerPurchase__message">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && offerData && (
          <>
            <div className="offerPurchase__timerBox">
              <div className="offerPurchase__timerLabel">
                הזמן שנותר להצעה זו
              </div>

              <div
                className={`offerPurchase__timerValue ${
                  isExpired ? "offerPurchase__timerValue--expired" : ""
                }`}
              >
                {isExpired ? "הזמן הסתיים" : formatCountdown(remainingSeconds)}
              </div>
            </div>

            <div className="offerPurchase__detailsGrid">
              <div className="offerPurchase__detailsCard">
                <div className="offerPurchase__sectionTitle">פרטי האירוע</div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">אירוע:</span>
                  <span className="offerPurchase__value">{offerData.event_name}</span>
                </div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">מיקום:</span>
                  <span className="offerPurchase__value">
                    {offerData.location || "לא צוין"}
                  </span>
                </div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">תאריך ושעה:</span>
                  <span className="offerPurchase__value">
                    {offerData.date_time || "לא צוין"}
                  </span>
                </div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">מסגרת:</span>
                  <span className="offerPurchase__value">
                    {offerData.competition || "לא צוין"}
                  </span>
                </div>
              </div>

              <div className="offerPurchase__detailsCard">
                <div className="offerPurchase__sectionTitle">פרטי ההצעה</div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">מספר כרטיסים:</span>
                  <span className="offerPurchase__value">{offerData.tickets_count}</span>
                </div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">יציע:</span>
                  <span className="offerPurchase__value">{offerData.stand || "לא צוין"}</span>
                </div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">שורה:</span>
                  <span className="offerPurchase__value">
                    {offerData.preferred_row || "לא צוין"}
                  </span>
                </div>

                <div className="offerPurchase__row">
                  <span className="offerPurchase__label">המקומות שהוקצו:</span>
                  <span className="offerPurchase__value">{seatsText}</span>
                </div>
              </div>
            </div>

            <div className="offerPurchase__noteBox">
              <div className="offerPurchase__noteTitle">מה יקרה לאחר הלחיצה?</div>
              <div className="offerPurchase__noteText">
                המערכת תיצור הזמנה זמנית לזמן מוגבל, תעביר אותך למסך תשלום,
                ולאחר תשלום מוצלח יופק כרטיס דיגיטלי מיידי עם קוד QR.
              </div>
            </div>

            <div className="offerPurchase__actions">
              <button
                type="button"
                className="offerPurchase__confirmBtn"
                onClick={handleConfirmPurchase}
                disabled={isExpired || isConfirming || isCancelling}
              >
                {isConfirming ? "מעביר לתשלום..." : "אשר והמשך לתשלום"}
              </button>

              <button
                type="button"
                className="offerPurchase__cancelBtn"
                onClick={handleCancelOffer}
                disabled={isExpired || isConfirming || isCancelling}
              >
                {isCancelling ? "מבטל..." : "בטל הזמנה"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}