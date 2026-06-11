import {
  nearEventsData,
  soldOutEventsData,
  israelSectionsData,
  worldSectionsData,
  featuredEventsData,
  tennisMustSeeEventData,
  finalFourMatchesData,
  worldCupMatchesData,
} from "../data/eventsData";
import { fetchJsonWithFallback } from "../utils/apiRequest";

const CACHE_KEY = "sportevent_events_cache_aug_sep_2026_v1";

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeArray(data) {
  return Array.isArray(data) ? data : [];
}

function flattenSections(sections) {
  return safeArray(sections).flatMap((section) =>
    Array.isArray(section.items) ? section.items : []
  );
}

function normalizeSections(sections) {
  return safeArray(sections).map((section) => ({
    title: section?.title || section?.sectionTitle || "אירועים נוספים",
    items: safeArray(section?.items),
  }));
}

function buildStaticBuckets() {
  return {
    nearEventsData: safeArray(nearEventsData),
    soldOutEventsData: safeArray(soldOutEventsData),
    israelSectionsData: safeArray(israelSectionsData),
    worldSectionsData: safeArray(worldSectionsData),
    featuredEventsData: safeArray(featuredEventsData),
    tennisMustSeeEventData: isPlainObject(tennisMustSeeEventData)
      ? tennisMustSeeEventData
      : {},
    finalFourMatchesData: safeArray(finalFourMatchesData),
    worldCupMatchesData: safeArray(worldCupMatchesData),
  };
}

function normalizeBuckets(rawData) {
  const source =
    isPlainObject(rawData?.buckets) ? rawData.buckets : isPlainObject(rawData) ? rawData : {};

  return {
    nearEventsData: safeArray(source.nearEventsData || source.near || []),
    soldOutEventsData: safeArray(source.soldOutEventsData || source.soldOut || []),
    israelSectionsData: normalizeSections(
      source.israelSectionsData || source.israelSections || []
    ),
    worldSectionsData: normalizeSections(
      source.worldSectionsData || source.worldSections || []
    ),
    featuredEventsData: safeArray(source.featuredEventsData || source.featured || []),
    tennisMustSeeEventData: isPlainObject(
      source.tennisMustSeeEventData || source.tennisMustSee
    )
      ? source.tennisMustSeeEventData || source.tennisMustSee
      : {},
    finalFourMatchesData: safeArray(
      source.finalFourMatchesData || source.finalFour || []
    ),
    worldCupMatchesData: safeArray(source.worldCupMatchesData || source.worldCup || []),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCachedBuckets() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = safeParse(raw);
  return parsed ? normalizeBuckets(parsed) : null;
}

function writeCachedBuckets(buckets) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(CACHE_KEY, JSON.stringify(buckets));
}

function resolveBuckets() {
  const cached = readCachedBuckets();
  return cached || buildStaticBuckets();
}

function countBucketItems(buckets) {
  const tennisCount =
    isPlainObject(buckets.tennisMustSeeEventData) &&
    Object.keys(buckets.tennisMustSeeEventData).length > 0
      ? 1
      : 0;

  return (
    safeArray(buckets.nearEventsData).length +
    safeArray(buckets.soldOutEventsData).length +
    flattenSections(buckets.israelSectionsData).length +
    flattenSections(buckets.worldSectionsData).length +
    safeArray(buckets.featuredEventsData).length +
    tennisCount +
    safeArray(buckets.finalFourMatchesData).length +
    safeArray(buckets.worldCupMatchesData).length
  );
}

export async function warmEventsCache() {
  try {
    const response = await fetchJsonWithFallback("get_events.php");
    const normalized = normalizeBuckets(response.data);
    const totalItems = countBucketItems(normalized);

    if (totalItems > 0) {
      writeCachedBuckets(normalized);
      return normalized;
    }

    return resolveBuckets();
  } catch (error) {
    return resolveBuckets();
  }
}

export function clearEventsCache() {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(CACHE_KEY);
}

export const getNearEvents = () => {
  return safeArray(resolveBuckets().nearEventsData);
};

export const getSoldOutEvents = () => {
  return safeArray(resolveBuckets().soldOutEventsData);
};

export const getIsraelSections = () => {
  return normalizeSections(resolveBuckets().israelSectionsData);
};

export const getWorldSections = () => {
  return normalizeSections(resolveBuckets().worldSectionsData);
};

export const getIsraelEventsFlat = () => {
  return flattenSections(getIsraelSections());
};

export const getWorldEventsFlat = () => {
  return flattenSections(getWorldSections());
};

export const getFeaturedEvents = () => {
  return safeArray(resolveBuckets().featuredEventsData);
};

export const getTennisMustSeeEvent = () => {
  const buckets = resolveBuckets();
  return isPlainObject(buckets.tennisMustSeeEventData)
    ? buckets.tennisMustSeeEventData
    : {};
};

export const getFinalFourMatches = () => {
  return safeArray(resolveBuckets().finalFourMatchesData);
};

export const getWorldCupMatches = () => {
  return safeArray(resolveBuckets().worldCupMatchesData);
};

export const getMustSeeEvents = () => {
  const tennisEvent = getTennisMustSeeEvent();
  const tennisArray =
    tennisEvent && Object.keys(tennisEvent).length > 0 ? [tennisEvent] : [];

  return [
    ...getFeaturedEvents(),
    ...tennisArray,
    ...getFinalFourMatches(),
    ...getWorldCupMatches(),
  ];
};

export const getAllEvents = () => {
  const tennisEvent = getTennisMustSeeEvent();
  const tennisArray =
    tennisEvent && Object.keys(tennisEvent).length > 0 ? [tennisEvent] : [];

  return [
    ...getNearEvents(),
    ...getSoldOutEvents(),
    ...getIsraelEventsFlat(),
    ...getWorldEventsFlat(),
    ...getFeaturedEvents(),
    ...tennisArray,
    ...getFinalFourMatches(),
    ...getWorldCupMatches(),
  ];
};

export const getEventById = (eventId) => {
  const allEvents = getAllEvents();
  return allEvents.find((eventItem) => String(eventItem.id) === String(eventId));
};