const packageTemplates = [
  {
    id: "basic",
    title: "חבילה בסיסית",
    hotelName: "City Sport Hotel",
    hotelStars: 3,
    basePrice: 1490,
    nights: 3,
    transfers: "העברה הלוך ושוב משדה התעופה",
    breakfast: "ארוחת בוקר יומית",
    extras: ["כרטיס לאירוע", "לינה בקרבת תחבורה ציבורית", "תיק יד בטיסה"],
  },
  {
    id: "plus",
    title: "חבילת פרימיום",
    hotelName: "Arena Premium Hotel",
    hotelStars: 4,
    basePrice: 2290,
    nights: 4,
    transfers: "העברות שדה תעופה ומלון",
    breakfast: "ארוחת בוקר ושדרוג מושב בטיסה",
    extras: ["כרטיס לאירוע", "מיקום מרכזי בעיר", "כבודה של 20 ק\"ג"],
  },
  {
    id: "vip",
    title: "חבילת VIP",
    hotelName: "Grand Champions Suites",
    hotelStars: 5,
    basePrice: 3590,
    nights: 4,
    transfers: "העברות פרטיות",
    breakfast: "ארוחות בוקר וטרקלין עסקים",
    extras: ["כרטיס לאירוע", "צ'ק אין מוקדם לפי זמינות", "סיור עיר קצר"],
  },
];

const roomTypes = [
  {
    id: "single",
    label: "חדר יחיד",
    extraPrice: 0,
    description: "מתאים לנוסע אחד",
  },
  {
    id: "double",
    label: "חדר זוגי",
    extraPrice: 380,
    description: "מיטה זוגית או שתי מיטות נפרדות",
  },
  {
    id: "family",
    label: "חדר משפחתי",
    extraPrice: 720,
    description: "מתאים לעד 4 אורחים",
  },
];

const europeFlights = [
  {
    id: "eu-1",
    label: "טיסה ישירה",
    airline: "EL AL / שותפה אירופית",
    outbound: "טיסה יוצאת: 06:30",
    inbound: "טיסה חוזרת: 23:40",
    extraPrice: 0,
  },
  {
    id: "eu-2",
    label: "טיסה נוחה בשעות צהריים",
    airline: "Arkia / שותפה אירופית",
    outbound: "טיסה יוצאת: 12:10",
    inbound: "טיסה חוזרת: 20:20",
    extraPrice: 240,
  },
  {
    id: "eu-3",
    label: "טיסה עם מזוודה גדולה",
    airline: "ישראייר / שותפה אירופית",
    outbound: "טיסה יוצאת: 08:15",
    inbound: "טיסה חוזרת: 22:55",
    extraPrice: 390,
  },
];

const northAmericaFlights = [
  {
    id: "na-1",
    label: "טיסה ישירה ארוכה",
    airline: "EL AL / Delta",
    outbound: "טיסה יוצאת: 00:50",
    inbound: "טיסה חוזרת: 22:35",
    extraPrice: 0,
  },
  {
    id: "na-2",
    label: "טיסה עם עצירה קצרה",
    airline: "Lufthansa / United",
    outbound: "טיסה יוצאת: 06:10",
    inbound: "טיסה חוזרת: 18:45",
    extraPrice: 560,
  },
  {
    id: "na-3",
    label: "טיסה גמישה עם כבודה מורחבת",
    airline: "Air Canada / United",
    outbound: "טיסה יוצאת: 09:20",
    inbound: "טיסה חוזרת: 20:15",
    extraPrice: 790,
  },
];

const middleEastFlights = [
  {
    id: "me-1",
    label: "טיסה ישירה מהירה",
    airline: "EL AL / Etihad",
    outbound: "טיסה יוצאת: 07:40",
    inbound: "טיסה חוזרת: 23:10",
    extraPrice: 0,
  },
  {
    id: "me-2",
    label: "טיסה ערב נוחה",
    airline: "ישראייר / Etihad",
    outbound: "טיסה יוצאת: 15:20",
    inbound: "טיסה חוזרת: 21:55",
    extraPrice: 190,
  },
  {
    id: "me-3",
    label: "טיסה עם מושב מועדף",
    airline: "FlyDubai / שותפה",
    outbound: "טיסה יוצאת: 09:45",
    inbound: "טיסה חוזרת: 20:30",
    extraPrice: 310,
  },
];

export function parseNumericPrice(value) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function getRoomTypes() {
  return roomTypes;
}

export function getDestinationRegion(eventItem) {
  const location = String(eventItem?.location || "").toLowerCase();

  if (
    location.includes("ארצות הברית") ||
    location.includes("קנדה") ||
    location.includes("מקסיקו") ||
    location.includes("ניו יורק") ||
    location.includes("לוס אנג'לס") ||
    location.includes("מקסיקו סיטי")
  ) {
    return "north-america";
  }

  if (
    location.includes("אבו דאבי") ||
    location.includes("דובאי") ||
    location.includes("קטאר")
  ) {
    return "middle-east";
  }

  return "europe";
}

export function getFlightOptionsForEvent(eventItem) {
  const region = getDestinationRegion(eventItem);

  if (region === "north-america") {
    return northAmericaFlights;
  }

  if (region === "middle-east") {
    return middleEastFlights;
  }

  return europeFlights;
}

export function getTravelPackagesForEvent(eventItem) {
  const ticketPrice = parseNumericPrice(eventItem?.price);

  return packageTemplates.map((item) => ({
    ...item,
    priceLabel: `${item.basePrice.toLocaleString("he-IL")} ₪`,
    eventTicketReference: ticketPrice,
  }));
}