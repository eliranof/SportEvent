const hostCandidates = [
  typeof window !== "undefined" ? window.location.hostname : "",
  "localhost",
  "127.0.0.1",
];

const rawCandidates = hostCandidates.map((host) =>
  host ? `http://${host}/sportevent-api` : ""
);

function uniqueNonEmpty(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildError(message, extra = {}) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error;
}

export async function fetchJsonWithFallback(endpoint, options = {}) {
  const normalizedEndpoint = String(endpoint || "").replace(/^\/+/, "");
  const candidates = uniqueNonEmpty(rawCandidates);
  const attemptedUrls = [];
  let lastError = null;

  for (const base of candidates) {
    const url = `${base}/${normalizedEndpoint}`;
    attemptedUrls.push(url);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        ...options,
      });

      const rawText = await response.text();
      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseError) {
        data = null;
      }

      if (!response.ok) {
        const serverMessage =
          data?.message ||
          data?.details ||
          rawText ||
          `HTTP ${response.status}`;

        lastError = buildError(serverMessage, {
          url,
          base,
          status: response.status,
          rawText,
          data,
          attemptedUrls,
        });
        continue;
      }

      return {
        ok: true,
        url,
        base,
        response,
        rawText,
        data,
        attemptedUrls,
      };
    } catch (error) {
      lastError = buildError(error.message || "Failed to fetch", {
        url,
        base,
        originalError: error,
        attemptedUrls,
      });
    }
  }

  throw (
    lastError ||
    buildError("No API base worked", {
      attemptedUrls,
    })
  );
}