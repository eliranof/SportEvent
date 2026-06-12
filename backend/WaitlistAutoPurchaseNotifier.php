import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaitlistAutoPurchaseNotifier.css";

const SEEN_KEY = "sporteventSeenAutoPurchasedWaitlist";

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

function getSeenIds() {
  const parsed = safeParse(localStorage.getItem(SEEN_KEY));
  return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
}

function saveSeenIds(ids) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
}

export default function WaitlistAutoPurchaseNotifier() {
  const navigate = useNavigate();
  const user = useMemo(() => getLoggedInUser(), []);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let isMounted = true;

    const checkWaitlist = async () => {
      try {
        const userId = user.id || 0;
        const email = user.email || "";
        const response = await fetch(
          `http://127.0.0.1/sportevent-api/get_waitlist.php?user_id=${userId}&email=${encodeURIComponent(
            email
          )}`
        );
        const data = await response.json();

        if (!isMounted || !data.success || !Array.isArray(data.waitlist)) {
          return;
        }

        const seenIds = getSeenIds();
        const autoPurchased = data.waitlist
          .filter((item) => String(item.status || "").toLowerCase() === "auto_purchased")
          .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

        const unseen = autoPurchased.find(
          (item) => !seenIds.includes(String(item.id))
        );

        if (!unseen) {
          return;
        }

        const nextSeenIds = [...seenIds, String(unseen.id)];
        saveSeenIds(nextSeenIds);
        setNotification({
          id: unseen.id,
          eventName: unseen.event_name || "אירוע ספורט",
          ticketsCount: unseen.tickets_count || 1,
          selectedSeats:
            unseen.offered_seats_text || unseen.display_seats || "בחירה לפי אזור",
          orderCode: unseen.order_code || "",
        });
      } catch (error) {
      }
    };

    checkWaitlist();
    const intervalId = window.setInterval(checkWaitlist, 7000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  if (!notification) {
    return null;
  }

  return (
    <div className="waitlistNotifier" dir="rtl" lang="he">
      <div className="waitlistNotifier__box">
        <div className="waitlistNotifier__title">נמצאה התאמה ברשימת ההמתנה</div>

        <div className="waitlistNotifier__text">
          הכרטיסים נרכשו עבורך אוטומטית בהצלחה.
        </div>

        <div className="waitlistNotifier__row">
          <strong>אירוע:</strong>
          <span>{notification.eventName}</span>
        </div>

        <div className="waitlistNotifier__row">
          <strong>כמות כרטיסים:</strong>
          <span>{notification.ticketsCount}</span>
        </div>

        <div className="waitlistNotifier__row">
          <strong>מושבים:</strong>
          <span>{notification.selectedSeats}</span>
        </div>

        {notification.orderCode ? (
          <div className="waitlistNotifier__row">
            <strong>מספר הזמנה:</strong>
            <span>{notification.orderCode}</span>
          </div>
        ) : null}

        <div className="waitlistNotifier__actions">
          <button
            type="button"
            className="waitlistNotifier__btn"
            onClick={() => {
              setNotification(null);
              navigate("/my-orders");
            }}
          >
            לסל ההזמנות שלי
          </button>

          <button
            type="button"
            className="waitlistNotifier__btn waitlistNotifier__btn--ghost"
            onClick={() => setNotification(null)}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}