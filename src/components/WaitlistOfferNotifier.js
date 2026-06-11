import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./WaitlistOfferNotifier.css";
import { fetchJsonWithFallback } from "../utils/apiRequest";

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

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const DESKTOP_NOTIFICATION_KEY = "sporteventDesktopWaitlistOfferKey";
const POLL_INTERVAL_MS = 5000;

export default function WaitlistOfferNotifier() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getSavedUser());
  const [offer, setOffer] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [hiddenRouteKey, setHiddenRouteKey] = useState("");
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const syncUser = () => {
      setUser(getSavedUser());
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("focus", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("focus", syncUser);
    };
  }, []);

  useEffect(() => {
    setHiddenRouteKey("");
  }, [location.pathname]);

  useEffect(() => {
    if (!offer || remainingSeconds <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [offer, remainingSeconds]);

  useEffect(() => {
    if (!user?.email && !user?.id && !user?.username) {
      setOffer(null);
      setRemainingSeconds(0);
      setActionMessage("");
      return undefined;
    }

    const checkOffer = async () => {
      if (isCheckingRef.current) {
        return;
      }

      isCheckingRef.current = true;

      try {
        const params = new URLSearchParams();

        if (user?.id) {
          params.set("user_id", String(user.id));
        }

        if (user?.email) {
          params.set("email", String(user.email));
        }

        if (user?.username) {
          params.set("username", String(user.username));
        }

        const { data } = await fetchJsonWithFallback(
          `get_active_waitlist_offer_for_user.php?${params.toString()}`
        );

        if (!data?.success) {
          return;
        }

        if (!data?.has_offer || !data?.offer) {
          setOffer(null);
          setRemainingSeconds(0);
          return;
        }

        const activeOffer = data.offer;
        const currentPageRequestId = location.pathname.startsWith("/events/sold-out/offer/")
          ? location.pathname.split("/").pop()
          : "";

        if (String(currentPageRequestId) === String(activeOffer.request_id)) {
          setOffer(null);
          setRemainingSeconds(0);
          return;
        }

        const nextKey = activeOffer.notification_key || String(activeOffer.request_id || "");
        const lastDesktopKey = sessionStorage.getItem(DESKTOP_NOTIFICATION_KEY) || "";

        if (
          lastDesktopKey !== nextKey &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          const bodyParts = [
            activeOffer.event_name,
            `${activeOffer.tickets_count} כרטיסים`,
            "נשלחה גם התראת מייל ו-SMS במערכת",
          ];

          if (activeOffer.location) {
            bodyParts.push(activeOffer.location);
          }

          new window.Notification("SportEvent - הצעת רכישה ל-90 דקות", {
            body: bodyParts.filter(Boolean).join(" | "),
          });

          sessionStorage.setItem(DESKTOP_NOTIFICATION_KEY, nextKey);
        }

        setOffer(activeOffer);
        setRemainingSeconds(Number(activeOffer.remaining_seconds) || 0);
      } catch (error) {
        // בדיקה שקטה כדי לא להפריע למשתמש בזמן גלישה באתר.
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkOffer();
    const intervalId = window.setInterval(checkOffer, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user, location.pathname]);

  const seatsText = useMemo(() => {
    if (!offer) {
      return "";
    }

    if (Array.isArray(offer.offered_seats) && offer.offered_seats.length > 0) {
      return offer.offered_seats.join(" | ");
    }

    return "המקומות שהוקצו יוצגו בדף ההצעה";
  }, [offer]);

  const activeRouteKey = offer
    ? `${location.pathname}|${offer.notification_key || offer.request_id}`
    : "";

  const handleCancelOffer = async () => {
    if (!offer || isCancelling) {
      return;
    }

    const approved = window.confirm(
      "האם לבטל את ההצעה? לאחר הביטול המושבים יעברו לממתין הבא בתור."
    );

    if (!approved) {
      return;
    }

    setIsCancelling(true);
    setActionMessage("");

    try {
      const { data } = await fetchJsonWithFallback("cancel_waitlist_request.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: offer.request_id,
          user_id: user?.id || 0,
          email: user?.email || "",
          username: user?.username || "",
        }),
      });

      if (!data?.success) {
        setActionMessage(data?.message || "ביטול ההצעה נכשל");
        setIsCancelling(false);
        return;
      }

      setActionMessage(data?.message || "ההצעה בוטלה והועברה לממתין הבא בתור");
      setOffer(null);
      setRemainingSeconds(0);
      setIsCancelling(false);
    } catch (error) {
      const serverMessage = error?.message || "שגיאה בחיבור לשרת";
      setActionMessage(serverMessage);
      setIsCancelling(false);
    }
  };

  const handleOpenOffer = () => {
    if (!offer) {
      return;
    }

    navigate(`/events/sold-out/offer/${offer.request_id}`);
    setOffer(null);
  };

  const handleCloseForThisPage = () => {
    if (!offer) {
      return;
    }

    setHiddenRouteKey(activeRouteKey);
  };

  if (!offer || remainingSeconds <= 0 || hiddenRouteKey === activeRouteKey) {
    return actionMessage ? (
      <div className="waitlistNotifier waitlistNotifier--message" dir="rtl" lang="he">
        <button
          type="button"
          className="waitlistNotifier__close"
          onClick={() => setActionMessage("")}
          aria-label="סגור הודעה"
          title="סגור הודעה"
        >
          ×
        </button>
        <div className="waitlistNotifier__badge">עדכון רשימת המתנה</div>
        <p className="waitlistNotifier__text">{actionMessage}</p>
      </div>
    ) : null;
  }

  return (
    <div className="waitlistNotifier" dir="rtl" lang="he">
      <button
        type="button"
        className="waitlistNotifier__close"
        onClick={handleCloseForThisPage}
        aria-label="הסתר בדף הנוכחי"
        title="הסתר בדף הנוכחי"
      >
        ×
      </button>

      <div className="waitlistNotifier__badge">כרטיסים פנויים נמצאו עבורך</div>

      <h2 className="waitlistNotifier__title">נמצאה התאמה ברשימת ההמתנה</h2>

      <p className="waitlistNotifier__text">
        אפשר עכשיו להשלים רכישה עבור <strong>{offer.event_name}</strong>.
      </p>

      <div className="waitlistNotifier__row">
        <span className="waitlistNotifier__label">מיקום:</span>
        <span className="waitlistNotifier__value">{offer.location || "לא צוין"}</span>
      </div>

      <div className="waitlistNotifier__row">
        <span className="waitlistNotifier__label">כמות כרטיסים:</span>
        <span className="waitlistNotifier__value">{offer.tickets_count}</span>
      </div>

      <div className="waitlistNotifier__row">
        <span className="waitlistNotifier__label">מושבים:</span>
        <span className="waitlistNotifier__value">{seatsText}</span>
      </div>

      <div className="waitlistNotifier__row">
        <span className="waitlistNotifier__label">התראות:</span>
        <span className="waitlistNotifier__value">אתר, מייל ו-SMS</span>
      </div>

      <div className="waitlistNotifier__timerBox">
        <div className="waitlistNotifier__timerLabel">הזמן שנותר להשלים רכישה</div>
        <div className="waitlistNotifier__timerValue">{formatCountdown(remainingSeconds)}</div>
      </div>

      <div className="waitlistNotifier__hint">
        ההודעה תמשיך להופיע בכל דפי האתר עד רכישה, ביטול או סיום 90 הדקות.
      </div>

      <div className="waitlistNotifier__actions">
        <button
          type="button"
          className="waitlistNotifier__action waitlistNotifier__action--primary"
          onClick={handleOpenOffer}
        >
          מעבר להצעת הרכישה
        </button>

        <button
          type="button"
          className="waitlistNotifier__action waitlistNotifier__action--danger"
          onClick={handleCancelOffer}
          disabled={isCancelling}
        >
          {isCancelling ? "מבטל..." : "בטל הזמנה"}
        </button>

        <button
          type="button"
          className="waitlistNotifier__action waitlistNotifier__action--secondary"
          onClick={handleCloseForThisPage}
          disabled={isCancelling}
        >
          הסתר בדף זה
        </button>
      </div>
    </div>
  );
}
