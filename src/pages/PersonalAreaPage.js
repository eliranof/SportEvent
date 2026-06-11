import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PersonalAreaPage.css";
import homeBg from "../assets/img/homepage2.png";
import { getAllEvents } from "../services/eventsService";
import { fetchJsonWithFallback } from "../utils/apiRequest";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function getMergedUser() {
  const localUser = safeParse(localStorage.getItem("user"));
  const sessionUser = safeParse(sessionStorage.getItem("user"));
  const extras = safeParse(localStorage.getItem("sporteventProfileExtras"));
  const lastRegistered = safeParse(
    localStorage.getItem("sporteventLastRegisteredProfile")
  );

  const user = localUser || sessionUser || null;

  if (!user) {
    return null;
  }

  return {
    id: user.id || "",
    username: user.username || "",
    fullName:
      user.fullName ||
      user.full_name ||
      user.name ||
      extras?.fullName ||
      lastRegistered?.fullName ||
      "",
    address:
      user.address ||
      user.homeAddress ||
      user.home_address ||
      extras?.address ||
      lastRegistered?.address ||
      "",
    email: user.email || extras?.email || lastRegistered?.email || "",
    phone: user.phone || extras?.phone || lastRegistered?.phone || "",
  };
}

function getSavedEventIds() {
  const savedIds =
    safeParse(localStorage.getItem("savedEventIds")) ||
    safeParse(localStorage.getItem("savedEvents")) ||
    safeParse(sessionStorage.getItem("savedEventIds")) ||
    [];

  if (Array.isArray(savedIds)) {
    return savedIds.map((item) => String(item));
  }

  return [];
}

function getFallbackOrdersForUser(currentUser) {
  const rawOrders =
    safeParse(localStorage.getItem("orders")) ||
    safeParse(localStorage.getItem("myOrders")) ||
    safeParse(localStorage.getItem("purchases")) ||
    safeParse(sessionStorage.getItem("orders")) ||
    [];

  if (!Array.isArray(rawOrders) || !currentUser) {
    return [];
  }

  return rawOrders.filter((order) => {
    const orderUserId = String(order.userId || order.user_id || "");
    const currentUserId = String(currentUser.id || "");
    const orderUsername = String(order.username || "");
    const currentUsername = String(currentUser.username || "");

    if (currentUserId && orderUserId && orderUserId === currentUserId) {
      return true;
    }

    if (currentUsername && orderUsername && orderUsername === currentUsername) {
      return true;
    }

    if (!order.userId && !order.user_id && !order.username) {
      return true;
    }

    return false;
  });
}

function normalizeOrders(serverOrders, fallbackOrders) {
  if (Array.isArray(serverOrders) && serverOrders.length > 0) {
    return serverOrders.map((order, index) => ({
      id: order.id || index + 1,
      orderCode: order.order_code || `ORD-${index + 1}`,
      eventName: order.event_name || "אירוע ספורט",
      category: order.category || "לא צוין",
      competition: order.competition || "לא צוין",
      location: order.location || "טרם צוין",
      dateTime: order.date_time || "טרם צוין",
      purchaseDate: order.purchase_date || "טרם צוין",
      ticketsCount: order.tickets_count || 1,
      selectedSeats: order.selected_seats || "לא נבחרו מושבים",
      price: order.price || "טרם נקבע",
      status: order.status || "אושר",
    }));
  }

  if (Array.isArray(fallbackOrders) && fallbackOrders.length > 0) {
    return fallbackOrders.map((order, index) => ({
      id: order.id || index + 1,
      orderCode:
        order.orderNumber ||
        order.order_code ||
        order.order_id ||
        `ORD-${100000 + index}`,
      eventName:
        order.event_name ||
        order.eventTitle ||
        order.title ||
        order.teams ||
        "אירוע ספורט",
      category: order.category || order.tag || "לא צוין",
      competition: order.competition || "לא צוין",
      location: order.location || order.stadiumName || order.stadium || "טרם צוין",
      dateTime: order.date_time || order.dateTime || order.eventDate || "טרם צוין",
      purchaseDate:
        order.purchase_date ||
        order.purchaseDate ||
        order.createdAt ||
        order.created_at ||
        "טרם צוין",
      ticketsCount:
        order.tickets_count ||
        order.ticketCount ||
        order.quantity ||
        (Array.isArray(order.selectedSeats) ? order.selectedSeats.length : 1),
      selectedSeats:
        order.selected_seats ||
        order.seatsSummary ||
        order.selectedSeatsText ||
        (Array.isArray(order.selectedSeats)
          ? order.selectedSeats
              .map((seat) => {
                const section = seat.section || seat.stand || seat.zone || "יציע";
                const row = seat.row || "שורה";
                const seatNumber =
                  seat.seat || seat.seatNumber || seat.number || "כיסא";
                return `${section} | שורה ${row} | כיסא ${seatNumber}`;
              })
              .join(" , ")
          : order.seats || "לא נבחרו מושבים"),
      price: order.price || order.totalPrice || order.total || "טרם נקבע",
      status: order.status || "אושר",
    }));
  }

  return [];
}

function formatOrderStatus(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid" || status === "הוזמן בהצלחה") {
    return "שולם";
  }

  if (normalized === "cancelled") {
    return "בוטל";
  }

  if (normalized === "pending_payment") {
    return "ממתין לתשלום";
  }

  if (normalized === "expired") {
    return "פג תוקף";
  }

  return status || "לא ידוע";
}

function normalizeWaitlistStatusKey(status) {
  const rawStatus = String(status ?? "").trim().toLowerCase();

  if (rawStatus === "" || rawStatus === "0") {
    return "waiting";
  }

  if (rawStatus === "1") {
    return "offered";
  }

  if (rawStatus === "2") {
    return "completed";
  }

  if (rawStatus === "3") {
    return "cancelled";
  }

  if (rawStatus === "4") {
    return "expired";
  }

  return rawStatus;
}

function formatWaitlistStatus(status) {
  const normalized = normalizeWaitlistStatusKey(status);

  if (normalized === "waiting") {
    return "ממתין בתור";
  }

  if (normalized === "offered") {
    return "הצעת רכישה נשלחה";
  }

  if (normalized === "expired") {
    return "פג תוקף להצעה";
  }

  if (normalized === "cancelled") {
    return "בוטל";
  }

  if (normalized === "completed" || normalized === "auto_purchased") {
    return "הרכישה הושלמה";
  }

  return String(status || "לא ידוע");
}

function toDisplayText(value, fallback = "בחירה לפי אזור") {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return fallback;
    }
    return value.join(" , ");
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return fallback;
}

function normalizeWaitlist(serverWaitlist) {
  if (!Array.isArray(serverWaitlist)) {
    return [];
  }

  return serverWaitlist.map((item, index) => {
    const selectedSeats =
      item.selected_seats_for_display ||
      item.selected_seats_short ||
      item.selected_seats ||
      [];
    const offeredSeats = item.offered_seats || [];
    const normalizedStatusKey = normalizeWaitlistStatusKey(item.status);

    return {
      id: item.id || index + 1,
      eventName: item.event_name || "אירוע ספורט",
      competition: item.competition || "לא צוין",
      location: item.location || "טרם צוין",
      dateTime: item.date_time || "טרם צוין",
      ticketsCount: item.tickets_count || 1,
      stand: item.stand || "לא צוין",
      preferredRow: item.preferred_row || "לא צוין",
      seats: toDisplayText(selectedSeats, "בחירה לפי אזור"),
      statusKey: normalizedStatusKey,
      status: formatWaitlistStatus(item.status),
      queuePosition: item.queue_position || "-",
      createdAt: item.created_at || "טרם צוין",
      offeredAt: item.offered_at || "",
      offerExpiresAt: item.offer_expires_at || "",
      offeredSeats: toDisplayText(offeredSeats, ""),
      orderCode: item.order_code || "",
      result: item.result || "",
    };
  });
}

function buildNotifications(
  user,
  orders,
  savedEventsCount,
  recommendedEventsCount,
  waitlistRequests
) {
  const today = new Date().toLocaleDateString("he-IL");
  const notifications = [];

  if (user) {
    notifications.push({
      type: "חדש",
      date: today,
      title: `ברוך הבא ${user.username || user.fullName || "משתמש"}`,
      text: "באזור האישי אפשר לצפות בפרטי החשבון, אירועים מומלצים, היסטוריית רכישות, רשימת המתנה והתראות פעילות.",
    });
  }

  if (orders.length > 0) {
    const latestOrder = orders[0];
    notifications.push({
      type: "רכישה",
      date: latestOrder.purchaseDate || today,
      title: "היסטוריית הרכישות נטענה בהצלחה",
      text: `הרכישה האחרונה שנמצאה היא עבור "${latestOrder.eventName}" ומספר ההזמנה הוא ${latestOrder.orderCode}.`,
    });
  }

  const latestOffer = waitlistRequests.find((item) => item.statusKey === "offered");

  if (latestOffer) {
    notifications.push({
      type: "רשימת המתנה",
      date: latestOffer.offeredAt || latestOffer.createdAt || today,
      title: "נשלחה אליך הצעת רכישה",
      text: `נמצאה התאמה עבור "${latestOffer.eventName}". יש להשלים את הרכישה בזמן הקצוב כדי לשמור את הכרטיסים.`,
    });
  }

  const latestCompleted = waitlistRequests.find(
    (item) => item.statusKey === "completed" || item.statusKey === "auto_purchased"
  );

  if (latestCompleted) {
    notifications.push({
      type: "רכישה",
      date: latestCompleted.offeredAt || latestCompleted.createdAt || today,
      title: "רכישה מרשימת ההמתנה הושלמה",
      text: `הבקשה עבור "${latestCompleted.eventName}" הושלמה בהצלחה.${
        latestCompleted.orderCode ? ` מספר הזמנה: ${latestCompleted.orderCode}.` : ""
      }`,
    });
  }

  const waitingCount = waitlistRequests.filter(
    (item) => item.statusKey === "waiting"
  ).length;

  if (waitingCount > 0) {
    notifications.push({
      type: "תור",
      date: today,
      title: "בקשות המתנה פעילות",
      text: `כרגע יש לך ${waitingCount} בקשות פעילות הממתינות להתפנות כרטיסים מתאימים.`,
    });
  }

  if (savedEventsCount > 0) {
    notifications.push({
      type: "שמירה",
      date: today,
      title: "אירועים שמורים זמינים עבורך",
      text: `שמרת ${savedEventsCount} אירועים לצפייה מאוחרת, השוואה או רכישה בהמשך.`,
    });
  }

  if (recommendedEventsCount > 0) {
    notifications.push({
      type: "המלצה",
      date: today,
      title: "נוצרו המלצות אישיות",
      text: `המערכת הכינה עבורך ${recommendedEventsCount} המלצות על בסיס הפעילות וההעדפות שלך.`,
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      type: "מידע",
      date: today,
      title: "עדיין אין התראות",
      text: "לאחר שמירת אירועים, כניסה לרשימת המתנה או ביצוע רכישות, ההתראות והעדכונים יוצגו כאן.",
    });
  }

  return notifications.slice(0, 4);
}

export default function PersonalAreaPage() {
  const navigate = useNavigate();

  const user = useMemo(() => getMergedUser(), []);
  const allEvents = useMemo(() => getAllEvents(), []);
  const savedEventIds = useMemo(() => getSavedEventIds(), []);
  const fallbackOrders = useMemo(() => getFallbackOrdersForUser(user), [user]);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(Boolean(user));
  const [waitlistRequests, setWaitlistRequests] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(Boolean(user));
  const [errorMessage, setErrorMessage] = useState("");
  const [waitlistErrorMessage, setWaitlistErrorMessage] = useState("");
  const [cancellingWaitlistId, setCancellingWaitlistId] = useState(null);

  const loadWaitlistRequests = async () => {
    if (!user) {
      setWaitlistRequests([]);
      setWaitlistLoading(false);
      return;
    }

    setWaitlistLoading(true);

    const userId = user.id || 0;
    const email = user.email || "";

    try {
      const { data } = await fetchJsonWithFallback(
        `get_waitlist.php?user_id=${userId}&email=${encodeURIComponent(email)}`
      );

      if (data?.success) {
        setWaitlistRequests(
          normalizeWaitlist(Array.isArray(data.waitlist) ? data.waitlist : [])
        );
        setWaitlistErrorMessage("");
      } else {
        setWaitlistRequests([]);
        setWaitlistErrorMessage(data?.message || "לא ניתן לטעון את רשימת ההמתנה");
      }
    } catch (error) {
      setWaitlistRequests([]);
      setWaitlistErrorMessage("שגיאה בטעינת רשימת ההמתנה");
    } finally {
      setWaitlistLoading(false);
    }
  };

  const canCancelWaitlistRequest = (requestItem) => {
    return requestItem?.statusKey === "waiting" || requestItem?.statusKey === "offered";
  };

  const handleCancelWaitlistRequest = async (requestItem) => {
    if (!user || !requestItem?.id) {
      return;
    }

    const confirmed = window.confirm(
      requestItem.statusKey === "offered"
        ? "לבטל את בקשת ההמתנה? אם קיימת עבורך הצעת רכישה פעילה, היא תבוטל וההצעה תוכל לעבור לממתין הבא."
        : "לבטל את בקשת ההמתנה?"
    );

    if (!confirmed) {
      return;
    }

    setCancellingWaitlistId(requestItem.id);
    setWaitlistErrorMessage("");

    try {
      const { data } = await fetchJsonWithFallback("cancel_waitlist_request.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestItem.id,
          user_id: user.id || 0,
          email: user.email || "",
        }),
      });

      if (data?.success) {
        await loadWaitlistRequests();
      } else {
        setWaitlistErrorMessage(data?.message || "ביטול בקשת ההמתנה נכשל");
      }
    } catch (error) {
      setWaitlistErrorMessage("שגיאה בביטול בקשת ההמתנה");
    } finally {
      setCancellingWaitlistId(null);
    }
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    const userId = user.id || 0;
    const email = user.email || "";

    fetchJsonWithFallback(
      `get_orders.php?user_id=${userId}&email=${encodeURIComponent(email)}`
    )
      .then(({ data }) => {
        if (data?.success) {
          const normalizedOrders = normalizeOrders(
            Array.isArray(data.orders) ? data.orders : [],
            fallbackOrders
          );
          setOrders(normalizedOrders);
          setErrorMessage("");
        } else {
          const normalizedFallback = normalizeOrders([], fallbackOrders);
          setOrders(normalizedFallback);
          setErrorMessage(data?.message || "לא ניתן לטעון את היסטוריית הרכישות");
        }
      })
      .catch(() => {
        const normalizedFallback = normalizeOrders([], fallbackOrders);
        setOrders(normalizedFallback);

        if (normalizedFallback.length === 0) {
          setErrorMessage("שגיאה בטעינת היסטוריית הרכישות");
        }
      })
      .finally(() => {
        setOrdersLoading(false);
      });
  }, [user, fallbackOrders]);

  useEffect(() => {
    if (!user) {
      setWaitlistRequests([]);
      setWaitlistLoading(false);
      return;
    }

    loadWaitlistRequests();
  }, [user]);

  const savedEventsCount = savedEventIds.length;
  const activeWaitlistCount = waitlistRequests.filter(
    (item) => item.statusKey === "waiting" || item.statusKey === "offered"
  ).length;

  const recommendedEvents = useMemo(() => {
    const savedIdsSet = new Set(savedEventIds.map((id) => String(id)));
    const recentCategory = orders.length > 0 ? orders[0].category || "" : "";

    const preferred = allEvents.filter((eventItem) => {
      const sameCategory =
        recentCategory &&
        (eventItem.category === recentCategory || eventItem.tag === recentCategory);

      return sameCategory && !savedIdsSet.has(String(eventItem.id));
    });

    const fallback = allEvents.filter(
      (eventItem) => !savedIdsSet.has(String(eventItem.id))
    );

    const merged = [...preferred, ...fallback];

    const unique = merged.filter(
      (eventItem, index, array) =>
        array.findIndex((item) => String(item.id) === String(eventItem.id)) === index
    );

    return unique.slice(0, 4);
  }, [allEvents, orders, savedEventIds]);

  const notifications = useMemo(
    () =>
      buildNotifications(
        user,
        orders,
        savedEventsCount,
        recommendedEvents.length,
        waitlistRequests
      ),
    [user, orders, savedEventsCount, recommendedEvents.length, waitlistRequests]
  );

  if (!user) {
    return (
      <div
        className="personalArea"
        style={{ backgroundImage: `url(${homeBg})` }}
        dir="rtl"
        lang="he"
      >
        <div className="personalArea__overlay" />

        <div className="personalArea__container">
          <div className="personalArea__topbar">
            <div className="personalArea__brand" onClick={() => navigate("/")}>
              SportEvent
            </div>

            <div className="personalArea__topActions">
              <button
                type="button"
                className="personalArea__topBtn personalArea__topBtn--home"
                onClick={() => navigate("/")}
              >
                חזרה לדף הבית
              </button>
            </div>
          </div>

          <div className="personalArea__guestBox">
            <h1 className="personalArea__guestTitle">האזור האישי</h1>

            <p className="personalArea__guestText">
              כדי לצפות בפרטי החשבון, היסטוריית הרכישות, האירועים המומלצים
              וההתראות שלך, יש להתחבר למערכת.
            </p>

            <div className="personalArea__guestActions">
              <button
                type="button"
                className="personalArea__guestBtn"
                onClick={() => navigate("/login")}
              >
                להתחברות
              </button>

              <button
                type="button"
                className="personalArea__guestBtn personalArea__guestBtn--ghost"
                onClick={() => navigate("/register")}
              >
                להרשמה
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="personalArea"
      style={{ backgroundImage: `url(${homeBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="personalArea__overlay" />

      <div className="personalArea__container">
        <div className="personalArea__topbar">
          <div className="personalArea__brand" onClick={() => navigate("/")}>
            SportEvent
          </div>

          <div className="personalArea__topActions">
            <button
              type="button"
              className="personalArea__topBtn personalArea__topBtn--home"
              onClick={() => navigate("/")}
            >
              חזרה לדף הבית
            </button>

            <button
              type="button"
              className="personalArea__topBtn"
              onClick={() => navigate("/my-orders")}
            >
              סל ההזמנות שלי
            </button>

            <button
              type="button"
              className="personalArea__topBtn"
              onClick={() => navigate("/my-saved-events")}
            >
              האירועים השמורים שלי
            </button>

            <button
              type="button"
              className="personalArea__topBtn personalArea__topBtn--ghost"
              onClick={() => navigate("/edit-profile")}
            >
              עריכת פרטים
            </button>
          </div>
        </div>

        <div className="personalArea__content">
          <section className="personalArea__hero">
            <div className="personalArea__heroText">
              <h1 className="personalArea__title">האזור האישי שלי</h1>

              <p className="personalArea__subtitle">
                ברוך הבא {user.fullName || user.username}, כאן אפשר לצפות בהזמנות,
                באירועים השמורים, בהמלצות, בהתראות וברשימת ההמתנה שלך.
              </p>
            </div>

            <div className="personalArea__stats">
              <div className="personalArea__statCard">
                <div className="personalArea__statNumber">{savedEventsCount}</div>
                <div className="personalArea__statLabel">אירועים שמורים</div>
              </div>

              <div className="personalArea__statCard">
                <div className="personalArea__statNumber">
                  {ordersLoading ? "..." : orders.length}
                </div>
                <div className="personalArea__statLabel">היסטוריית רכישות</div>
              </div>

              <div className="personalArea__statCard">
                <div className="personalArea__statNumber">
                  {waitlistLoading ? "..." : activeWaitlistCount}
                </div>
                <div className="personalArea__statLabel">בקשות המתנה פעילות</div>
              </div>

              <div className="personalArea__statCard">
                <div className="personalArea__statNumber">
                  {notifications.length}
                </div>
                <div className="personalArea__statLabel">התראות ועדכונים</div>
              </div>

              <div className="personalArea__statCard">
                <div className="personalArea__statNumber">
                  {recommendedEvents.length}
                </div>
                <div className="personalArea__statLabel">אירועים מומלצים</div>
              </div>
            </div>
          </section>

          {errorMessage && (
            <div className="personalArea__message personalArea__message--error">
              {errorMessage}
            </div>
          )}

          {waitlistErrorMessage && (
            <div className="personalArea__message personalArea__message--error">
              {waitlistErrorMessage}
            </div>
          )}

          <section className="personalArea__grid">
            <article className="personalArea__card personalArea__card--profile">
              <div className="personalArea__sectionHeader">
                <h2 className="personalArea__sectionTitle">פרטי החשבון</h2>

                <button
                  type="button"
                  className="personalArea__linkBtn"
                  onClick={() => navigate("/edit-profile")}
                >
                  עריכת פרטים
                </button>
              </div>

              <div className="personalArea__profileList">
                <div className="personalArea__profileItem">
                  <div className="personalArea__profileLabel">שם מלא</div>
                  <div className="personalArea__profileValue">
                    {user.fullName || "לא הוגדר"}
                  </div>
                </div>

                <div className="personalArea__profileItem">
                  <div className="personalArea__profileLabel">שם משתמש</div>
                  <div className="personalArea__profileValue">
                    {user.username || "לא הוגדר"}
                  </div>
                </div>

                <div className="personalArea__profileItem">
                  <div className="personalArea__profileLabel">כתובת מגורים</div>
                  <div className="personalArea__profileValue">
                    {user.address || "לא הוגדרה"}
                  </div>
                </div>

                <div className="personalArea__profileItem">
                  <div className="personalArea__profileLabel">אימייל</div>
                  <div className="personalArea__profileValue">
                    {user.email || "לא הוגדר"}
                  </div>
                </div>

                <div className="personalArea__profileItem">
                  <div className="personalArea__profileLabel">טלפון</div>
                  <div className="personalArea__profileValue">
                    {user.phone || "לא הוגדר"}
                  </div>
                </div>
              </div>
            </article>

            <article className="personalArea__card personalArea__card--notifications">
              <div className="personalArea__sectionHeader">
                <h2 className="personalArea__sectionTitle">התראות ועדכונים</h2>
              </div>

              <div className="personalArea__notificationsList">
                {notifications.map((item, index) => (
                  <div className="personalArea__notificationItem" key={index}>
                    <div className="personalArea__notificationTop">
                      <span className="personalArea__notificationBadge">
                        {item.type}
                      </span>

                      <span className="personalArea__notificationDate">
                        {item.date}
                      </span>
                    </div>

                    <div className="personalArea__notificationTitle">
                      {item.title}
                    </div>

                    <div className="personalArea__notificationText">
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="personalArea__card personalArea__card--recommendations">
              <div className="personalArea__sectionHeader">
                <h2 className="personalArea__sectionTitle">אירועים מומלצים</h2>

                <button
                  type="button"
                  className="personalArea__linkBtn"
                  onClick={() => navigate("/events/near")}
                >
                  לכל האירועים
                </button>
              </div>

              {recommendedEvents.length === 0 ? (
                <div className="personalArea__emptyState">
                  עדיין אין אירועים מומלצים להצגה.
                </div>
              ) : (
                <div className="personalArea__recommendationsGrid">
                  {recommendedEvents.map((eventItem) => (
                    <div className="personalArea__eventCard" key={eventItem.id}>
                      <div className="personalArea__eventCategory">
                        {eventItem.category || eventItem.tag || "אירוע"}
                      </div>

                      <div className="personalArea__eventTitle">
                        {eventItem.teams || eventItem.title}
                      </div>

                      <div className="personalArea__eventMeta">
                        {eventItem.competition || "מסגרת תחרות תעודכן בהמשך"}
                      </div>

                      <div className="personalArea__eventMeta">
                        {eventItem.location || "מיקום יעודכן בהמשך"}
                      </div>

                      <div className="personalArea__eventMeta">
                        {eventItem.dateTime || "מועד יעודכן בהמשך"}
                      </div>

                      <div className="personalArea__eventPrice">
                        מחיר: {eventItem.price || "טרם נקבע"}
                      </div>

                      <button
                        type="button"
                        className="personalArea__eventBtn"
                        onClick={() =>
                          navigate(`/event/${eventItem.id}`, {
                            state: { selectedEvent: eventItem },
                          })
                        }
                      >
                        לפרטי האירוע
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="personalArea__card personalArea__card--orders">
              <div className="personalArea__sectionHeader">
                <h2 className="personalArea__sectionTitle">היסטוריית רכישות</h2>

                <button
                  type="button"
                  className="personalArea__linkBtn"
                  onClick={() => navigate("/my-orders")}
                >
                  לכל ההזמנות
                </button>
              </div>

              {ordersLoading ? (
                <div className="personalArea__emptyState">טוען היסטוריית רכישות...</div>
              ) : orders.length === 0 ? (
                <div className="personalArea__emptyState">
                  עדיין לא בוצעו רכישות. לאחר ביצוע הזמנה, היסטוריית הרכישות
                  תופיע כאן.
                </div>
              ) : (
                <div className="personalArea__ordersList personalArea__ordersList--compact">
                  {orders.slice(0, 3).map((order) => (
                    <button
                      type="button"
                      className="personalArea__orderCompactItem"
                      key={order.id}
                      onClick={() => navigate(`/my-orders?orderId=${order.id}`)}
                    >
                      <div className="personalArea__orderCompactMain">
                        <div className="personalArea__orderTitle">{order.eventName}</div>
                        <div className="personalArea__orderCode">{order.orderCode}</div>
                      </div>

                      <div className="personalArea__orderCompactMeta">
                        <span className="personalArea__orderCompactBadge">
                          תאריך האירוע: {order.dateTime}
                        </span>
                        <span className="personalArea__orderCompactBadge">
                          מחיר: {order.price}
                        </span>
                        <span className="personalArea__orderStatus">
                          {formatOrderStatus(order.status)}
                        </span>
                      </div>

                      <div className="personalArea__orderCompactArrow">◀</div>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="personalArea__card personalArea__card--orders">
              <div className="personalArea__sectionHeader">
                <h2 className="personalArea__sectionTitle">רשימת המתנה</h2>
              </div>

              {waitlistLoading ? (
                <div className="personalArea__emptyState">טוען את רשימת ההמתנה...</div>
              ) : waitlistRequests.length === 0 ? (
                <div className="personalArea__emptyState">
                  עדיין לא נוספו בקשות לרשימת ההמתנה. לאחר הרשמה לאירוע Sold Out,
                  הבקשות יופיעו כאן.
                </div>
              ) : (
                <div className="personalArea__ordersList">
                  {waitlistRequests.slice(0, 3).map((requestItem) => (
                    <div className="personalArea__orderItem" key={requestItem.id}>
                      <div className="personalArea__orderTitle">
                        {requestItem.eventName}
                      </div>

                      <div className="personalArea__orderRow">
                        <strong>מסגרת התחרות</strong>
                        <span>{requestItem.competition}</span>
                      </div>

                      <div className="personalArea__orderRow">
                        <strong>מיקום</strong>
                        <span>{requestItem.location}</span>
                      </div>

                      <div className="personalArea__orderRow">
                        <strong>תאריך האירוע</strong>
                        <span>{requestItem.dateTime}</span>
                      </div>

                      <div className="personalArea__orderRow">
                        <strong>כמות כרטיסים</strong>
                        <span>{requestItem.ticketsCount}</span>
                      </div>

                      <div className="personalArea__orderRow">
                        <strong>אזור מבוקש</strong>
                        <span>{requestItem.stand}</span>
                      </div>

                      <div className="personalArea__orderRow">
                        <strong>מושבים שנבחרו</strong>
                        <span>{requestItem.seats}</span>
                      </div>

                      {requestItem.offeredSeats ? (
                        <div className="personalArea__orderRow">
                          <strong>מושבים שהוקצו</strong>
                          <span>{requestItem.offeredSeats}</span>
                        </div>
                      ) : null}

                      {requestItem.offerExpiresAt ? (
                        <div className="personalArea__orderRow">
                          <strong>תוקף ההצעה עד</strong>
                          <span>{requestItem.offerExpiresAt}</span>
                        </div>
                      ) : null}

                      <div className="personalArea__orderRow">
                        <strong>מיקום בתור</strong>
                        <span>{requestItem.queuePosition}</span>
                      </div>

                      <div className="personalArea__orderRow">
                        <strong>תאריך בקשה</strong>
                        <span>{requestItem.createdAt}</span>
                      </div>

                      <div className="personalArea__orderStatus">
                        {requestItem.status}
                        {requestItem.orderCode ? ` | ${requestItem.orderCode}` : ""}
                      </div>

                      {canCancelWaitlistRequest(requestItem) ? (
                        <div className="personalArea__waitlistActions">
                          <button
                            type="button"
                            className="personalArea__waitlistCancelBtn"
                            onClick={() => handleCancelWaitlistRequest(requestItem)}
                            disabled={cancellingWaitlistId === requestItem.id}
                          >
                            {cancellingWaitlistId === requestItem.id
                              ? "מבטל..."
                              : requestItem.statusKey === "offered"
                              ? "בטל בקשה והצע לממתין הבא"
                              : "בטל בקשת המתנה"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}