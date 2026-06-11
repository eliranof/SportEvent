import { fetchJsonWithFallback } from "../utils/apiRequest";

const STORAGE_PREFIX = "sporteventSeatSimulation:";
const PRICING_STORAGE_PREFIX = "sporteventDynamicPricing:";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export function parsePriceToNumber(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 300;
}

function normalizeSectionCode(value, fallback) {
  const rawValue = String(value || fallback || "SECTION").trim();
  return rawValue.replace(/\s+/g, "").toUpperCase();
}

function normalizeStandCode(value) {
  const rawValue = String(value || "").trim();
  const lowerValue = rawValue.toLowerCase();

  const map = {
    vip: "VIP",
    west: "W",
    w: "W",
    "מערבי": "W",
    "מערב": "W",
    east: "E",
    e: "E",
    "מזרחי": "E",
    "מזרח": "E",
    family: "F",
    f: "F",
    "משפחות": "F",
    "משפחה": "F",
    north: "N",
    n: "N",
    "צפוני": "N",
    "צפון": "N",
    south: "S",
    s: "S",
    "דרומי": "S",
    "דרום": "S",
    center: "C",
    central: "C",
    c: "C",
    "מרכזי": "C",
    "מרכז": "C",
    weststand: "W",
    eaststand: "E",
    familystand: "F",
  };

  if (map[lowerValue]) {
    return map[lowerValue];
  }

  const normalizedCode = normalizeSectionCode(rawValue, rawValue);
  const codeMap = {
    VIP: "VIP",
    WEST: "W",
    EAST: "E",
    FAMILY: "F",
    NORTH: "N",
    SOUTH: "S",
    CENTER: "C",
    CENTRAL: "C",
  };

  return codeMap[normalizedCode] || normalizedCode;
}

function buildDefaultSections(basePrice) {
  return [
    { code: "VIP", title: "VIP", price: basePrice + 180, note: "מרכזי וקרוב למשטח" },
    { code: "WEST", title: "מערבי", price: basePrice + 80, note: "זווית צפייה מצוינת" },
    { code: "EAST", title: "מזרחי", price: basePrice, note: "האזור המבוקש ביותר" },
    {
      code: "FAMILY",
      title: "משפחות",
      price: Math.max(basePrice - 70, 120),
      note: "מתאים למשפחות וקבוצות",
    },
  ];
}

function getStorageKey(eventId) {
  return `${STORAGE_PREFIX}${String(eventId)}`;
}

function getPricingStorageKey(eventId) {
  return `${PRICING_STORAGE_PREFIX}${String(eventId)}`;
}

function persistPricingOverrides(eventId, pricingRows) {
  localStorage.setItem(getPricingStorageKey(eventId), JSON.stringify(pricingRows || []));
}

function getStoredPricingOverrides(eventId) {
  return safeParse(localStorage.getItem(getPricingStorageKey(eventId))) || [];
}

function applyPricingOverridesToSections(eventId, sections) {
  const pricingRows = getStoredPricingOverrides(eventId);

  if (!Array.isArray(pricingRows) || pricingRows.length === 0) {
    return sections;
  }

  const pricingMap = new Map(
    pricingRows.map((row) => [normalizeStandCode(row.stand_code), row])
  );

  return sections.map((section) => {
    const standCode = normalizeStandCode(section.code || section.title);
    const override = pricingMap.get(standCode);

    if (!override || !Number(override.price_amount)) {
      return section;
    }

    return {
      ...section,
      price: Number(override.price_amount),
      title: override.display_name || section.title,
      priceLabel: override.price_label || `${Number(override.price_amount)} ₪`,
    };
  });
}

function normalizeSections(eventItem, basePrice) {
  let sections;

  if (!Array.isArray(eventItem?.sections) || eventItem.sections.length === 0) {
    sections = buildDefaultSections(basePrice);
  } else {
    sections = eventItem.sections.map((section, index) => {
      const sectionTitle =
        section.title || section.name || section.label || `יציע ${index + 1}`;

      const numericPrice =
        typeof section.price === "number"
          ? section.price
          : parsePriceToNumber(section.price) || Math.max(basePrice - index * 20, 120);

      return {
        code: normalizeSectionCode(section.code, sectionTitle),
        title: sectionTitle,
        price: numericPrice,
        note: section.note || "פרטי היציע זמינים בעמוד האירוע",
      };
    });
  }

  return applyPricingOverridesToSections(eventItem?.id, sections);
}

function normalizeCompetition(eventItem) {
  return (
    eventItem?.competition ||
    eventItem?.league ||
    eventItem?.tournament ||
    eventItem?.framework ||
    eventItem?.eventFramework ||
    eventItem?.competitionName ||
    eventItem?.badge ||
    eventItem?.category ||
    "מסגרת התחרות תעודכן בהמשך"
  );
}

export function normalizeEventForSimulation(eventItem) {
  if (!eventItem) {
    return null;
  }

  const basePrice = parsePriceToNumber(eventItem.price);
  const sections = normalizeSections(eventItem, basePrice);

  return {
    ...eventItem,
    basePrice,
    competition: normalizeCompetition(eventItem),
    stadiumName:
      eventItem.stadiumName || eventItem.location || "אצטדיון או היכל יעודכנו בהמשך",
    price: eventItem.price || `${basePrice} ₪`,
    distanceFromField: eventItem.distanceFromField || "8 עד 34 מטרים",
    accessibility:
      Array.isArray(eventItem.accessibility) && eventItem.accessibility.length > 0
        ? eventItem.accessibility
        : [
            "גישה מלאה לכיסאות גלגלים",
            "מעלית ליציעים מרכזיים",
            "מקומות נגישים מסומנים במפה",
            "שירותי נכים בקרבת היציע",
          ],
    fullDescription:
      eventItem.fullDescription ||
      "בעמוד זה מוצגים פרטי האירוע המלאים, מחירי הכרטיסים, מידע על האצטדיון, רמת תפוסה, נגישות ליציעים ומעבר לבחירת מושבים מדויקת.",
    sections,
  };
}

function buildCompactSeatLabel(sectionCode, sectionTitle, rowNumber, seatNumber) {
  const standCode = normalizeStandCode(sectionCode || sectionTitle);
  return `${standCode}-${rowNumber}-${seatNumber}`;
}

function createBaseSeats(normalizedEvent) {
  const seatsPerSection = 12;
  const seatsPerRow = 6;

  return normalizedEvent.sections.flatMap((section) =>
    Array.from({ length: seatsPerSection }, (_, index) => {
      const rowNumber = Math.floor(index / seatsPerRow) + 1;
      const seatNumber = (index % seatsPerRow) + 1;
      const seatId = `${normalizedEvent.id}-${section.code}-R${rowNumber}-S${seatNumber}`;

      return {
        id: seatId,
        shortId: `ש${rowNumber} | כ${seatNumber}`,
        compactLabel: buildCompactSeatLabel(section.code, section.title, rowNumber, seatNumber),
        label: `יציע ${section.title} | שורה ${rowNumber} | כיסא ${seatNumber}`,
        sectionCode: section.code,
        sectionTitle: section.title,
        rowNumber,
        seatNumber,
        price: section.price,
        status: "available",
      };
    })
  );
}

function hashString(value) {
  return String(value || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function persistSeats(eventId, seats) {
  localStorage.setItem(getStorageKey(eventId), JSON.stringify(seats));
}

function createInitialSeats(normalizedEvent) {
  const seats = createBaseSeats(normalizedEvent);
  const totalSeats = seats.length;
  const hash = hashString(normalizedEvent.id);
  const soldTarget = Math.min(totalSeats - 6, 18 + (hash % 11));
  const soldSeatIds = new Set();

  let pointer = hash % totalSeats;

  while (soldSeatIds.size < soldTarget) {
    soldSeatIds.add(seats[pointer].id);
    pointer = (pointer + 5) % totalSeats;
  }

  return seats.map((seat) => ({
    ...seat,
    status: soldSeatIds.has(seat.id) ? "sold" : "available",
  }));
}

function mergeStoredStatus(baseSeats, storedSeats) {
  if (!Array.isArray(storedSeats) || storedSeats.length === 0) {
    return null;
  }

  const storedMap = new Map(
    storedSeats.filter((seat) => seat && seat.id).map((seat) => [seat.id, seat])
  );

  return baseSeats.map((seat) => {
    const storedSeat = storedMap.get(seat.id);
    return {
      ...seat,
      status: storedSeat?.status === "sold" ? "sold" : "available",
    };
  });
}

export function getEventSeatState(eventItem) {
  const normalizedEvent = normalizeEventForSimulation(eventItem);

  if (!normalizedEvent) {
    return [];
  }

  const baseSeats = createBaseSeats(normalizedEvent);
  const storedSeats = safeParse(localStorage.getItem(getStorageKey(normalizedEvent.id)));
  const mergedSeats = mergeStoredStatus(baseSeats, storedSeats);

  if (mergedSeats) {
    persistSeats(normalizedEvent.id, mergedSeats);
    return mergedSeats;
  }

  const initialSeats = createInitialSeats(normalizedEvent);
  persistSeats(normalizedEvent.id, initialSeats);
  return initialSeats;
}

export function getEventSimulationSummary(eventItem) {
  const normalizedEvent = normalizeEventForSimulation(eventItem);

  if (!normalizedEvent) {
    return null;
  }

  const seats = getEventSeatState(normalizedEvent);
  const totalSeats = seats.length;
  const soldSeats = seats.filter((seat) => seat.status === "sold").length;
  const availableSeats = totalSeats - soldSeats;
  const occupancyPercent = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;
  const occupancyText = `${occupancyPercent}% תפוסה`;

  const sectionsSummary = normalizedEvent.sections.map((section) => {
    const sectionSeats = seats.filter((seat) => seat.sectionCode === section.code);
    const sectionSoldCount = sectionSeats.filter((seat) => seat.status === "sold").length;

    return {
      ...section,
      availableCount: sectionSeats.length - sectionSoldCount,
      soldCount: sectionSoldCount,
      priceLabel: `${section.price} ₪`,
    };
  });

  return {
    event: {
      ...normalizedEvent,
      occupancy: occupancyText,
    },
    seats,
    totalSeats,
    soldSeats,
    availableSeats,
    occupancyPercent,
    occupancyText,
    sectionsSummary,
  };
}

function parseSeatReference(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    if (value.id) {
      return { type: "id", value: String(value.id) };
    }

    if (value.label) {
      return parseSeatReference(value.label);
    }
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const fullLabelMatch = text.match(
    /(?:יציע\s*)?([^|,;]+)\|\s*שורה\s*(\d+)\s*\|\s*(?:כסא|כיסא|מושב|seat)\s*(\d+)/i
  );
  if (fullLabelMatch) {
    return {
      type: "compact",
      value: buildCompactSeatLabel(
        fullLabelMatch[1].trim(),
        fullLabelMatch[1].trim(),
        Number(fullLabelMatch[2]),
        Number(fullLabelMatch[3])
      ),
    };
  }

  const compactMatch = text.match(/^([A-Za-zא-ת]+)-(\d+)-(\d+)$/i);
  if (compactMatch) {
    return {
      type: "compact",
      value: `${normalizeStandCode(compactMatch[1])}-${Number(compactMatch[2])}-${Number(
        compactMatch[3]
      )}`,
    };
  }

  const seatIdMatch = text.match(/^(?:.+-)?([A-Za-z]+)-R(\d+)-S(\d+)$/i);
  if (seatIdMatch) {
    return {
      type: "compact",
      value: `${normalizeStandCode(seatIdMatch[1])}-${Number(seatIdMatch[2])}-${Number(
        seatIdMatch[3]
      )}`,
    };
  }

  return { type: "id", value: text };
}

function normalizeSeatReferenceList(values) {
  const items = Array.isArray(values) ? values : [values];
  const normalized = [];

  items.forEach((item) => {
    if (typeof item === "string") {
      const fullLabels = [
        ...item.matchAll(
          /(?:יציע\s*)?[^|,;\n]+\|\s*שורה\s*\d+\s*\|\s*(?:כסא|כיסא|מושב|seat)\s*\d+/gi
        ),
      ].map((match) => String(match[0]).trim());

      if (fullLabels.length > 0) {
        fullLabels.forEach((label) => normalized.push(parseSeatReference(label)));
      }

      const compactKeys = [
        ...item.matchAll(
          /\b(?:[A-Za-zא-ת]+-\d+-\d+|(?:[^\s|,;]+-)?[A-Za-z]+-R\d+-S\d+)\b/gi
        ),
      ].map((match) => String(match[0]).trim());

      compactKeys.forEach((label) => normalized.push(parseSeatReference(label)));

      if (fullLabels.length === 0 && compactKeys.length === 0) {
        normalized.push(parseSeatReference(item));
      }
      return;
    }

    normalized.push(parseSeatReference(item));
  });

  return normalized.filter(Boolean);
}

function applySeatStatusByReferences(eventItem, references, status) {
  const normalizedEvent = normalizeEventForSimulation(eventItem);

  if (!normalizedEvent || !references) {
    return [];
  }

  const normalizedRefs = normalizeSeatReferenceList(references);
  const wantedIds = new Set(
    normalizedRefs.filter((ref) => ref.type === "id").map((ref) => String(ref.value))
  );
  const wantedCompact = new Set(
    normalizedRefs.filter((ref) => ref.type === "compact").map((ref) => String(ref.value))
  );

  if (wantedIds.size === 0 && wantedCompact.size === 0) {
    return getEventSeatState(normalizedEvent);
  }

  const updatedSeats = getEventSeatState(normalizedEvent).map((seat) => {
    const matches = wantedIds.has(String(seat.id)) || wantedCompact.has(String(seat.compactLabel));

    if (!matches) {
      return seat;
    }

    return {
      ...seat,
      status,
    };
  });

  persistSeats(normalizedEvent.id, updatedSeats);
  return updatedSeats;
}

export function areSeatsStillAvailable(eventItem, seatIds) {
  const seats = getEventSeatState(eventItem);
  const wantedCompact = new Set(
    normalizeSeatReferenceList(seatIds)
      .filter((ref) => ref.type === "compact")
      .map((ref) => String(ref.value))
  );
  const wantedIds = new Set(
    normalizeSeatReferenceList(seatIds)
      .filter((ref) => ref.type === "id")
      .map((ref) => String(ref.value))
  );

  return seats
    .filter((seat) => wantedIds.has(String(seat.id)) || wantedCompact.has(String(seat.compactLabel)))
    .every((seat) => seat.status === "available");
}

export function markEventSeatsAsSold(eventItem, seatReferences) {
  return applySeatStatusByReferences(eventItem, seatReferences, "sold");
}

export function getSeatLabelsByIds(eventItem, seatIds) {
  const wantedIds = new Set((seatIds || []).map((seatId) => String(seatId)));
  return getEventSeatState(eventItem)
    .filter((seat) => wantedIds.has(String(seat.id)))
    .map((seat) => seat.label);
}

export function markEventSeatLabelsAsAvailable(eventItem, seatReferences) {
  return applySeatStatusByReferences(eventItem, seatReferences, "available");
}

export async function syncEventInventoryFromServer(eventItem) {
  const normalizedEvent = normalizeEventForSimulation(eventItem);

  if (!normalizedEvent?.id) {
    return [];
  }

  try {
    const { data } = await fetchJsonWithFallback(
      `get_event_inventory.php?event_id=${encodeURIComponent(normalizedEvent.id)}`
    );

    if (!data?.success) {
      return getEventSeatState(normalizedEvent);
    }

    const soldSeatKeys = Array.isArray(data.sold_seat_keys) ? data.sold_seat_keys : [];
    const availableSeatKeys = Array.isArray(data.available_seat_keys)
      ? data.available_seat_keys
      : [];
    const pricingOverrides = Array.isArray(data.pricing_overrides)
      ? data.pricing_overrides
      : [];

    persistPricingOverrides(normalizedEvent.id, pricingOverrides);

    const soldCompactSet = new Set(
      normalizeSeatReferenceList(soldSeatKeys)
        .filter((ref) => ref.type === "compact")
        .map((ref) => String(ref.value))
    );

    const availableCompactSet = new Set(
      normalizeSeatReferenceList(availableSeatKeys)
        .filter((ref) => ref.type === "compact")
        .map((ref) => String(ref.value))
    );

    const updatedSeats = getEventSeatState(normalizedEvent).map((seat) => {
      if (availableCompactSet.has(String(seat.compactLabel))) {
        return {
          ...seat,
          status: "available",
        };
      }

      if (soldCompactSet.has(String(seat.compactLabel))) {
        return {
          ...seat,
          status: "sold",
        };
      }

      return seat;
    });

    persistSeats(normalizedEvent.id, updatedSeats);
    return updatedSeats;
  } catch (error) {
    return getEventSeatState(normalizedEvent);
  }
}