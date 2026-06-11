const API_CANDIDATES = [
  "http://127.0.0.1/sportevent-api",
  "http://localhost/sportevent-api",
];

const ADMIN_STORAGE_KEY = "sportevent_admin_user";
const ADMIN_PENDING_2FA_KEY = "sportevent_admin_pending_2fa";

async function adminApiRequest(endpoint, options = {}) {
  let lastError = null;

  for (const base of API_CANDIDATES) {
    try {
      const response = await fetch(`${base}/${endpoint}`, options);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Admin API request failed");
}

export function getAdminUser() {
  try {
    const raw = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function getPendingAdmin2FA() {
  try {
    const raw = sessionStorage.getItem(ADMIN_PENDING_2FA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function clearPendingAdmin2FA() {
  sessionStorage.removeItem(ADMIN_PENDING_2FA_KEY);
}

export function clearAdminUser() {
  sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_PENDING_2FA_KEY);
}

export async function loginAdmin(username, password, nextPath = "/admin/dashboard") {
  const data = await adminApiRequest("admin_login.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const pendingChallenge = {
    challenge_id: data.challenge_id,
    expires_in_minutes: data.expires_in_minutes,
    dev_code: data.dev_code || "",
    admin_preview: data.admin_preview || null,
    nextPath,
  };

  sessionStorage.setItem(ADMIN_PENDING_2FA_KEY, JSON.stringify(pendingChallenge));
  sessionStorage.removeItem(ADMIN_STORAGE_KEY);

  return pendingChallenge;
}

export async function verifyAdmin2FA(code) {
  const pending = getPendingAdmin2FA();

  if (!pending?.challenge_id) {
    throw new Error("לא נמצא אתגר אימות פעיל");
  }

  const data = await adminApiRequest("admin_verify_2fa.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      challenge_id: pending.challenge_id,
      code,
    }),
  });

  if (data?.admin) {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data.admin));
    sessionStorage.removeItem(ADMIN_PENDING_2FA_KEY);
  }

  return data.admin || null;
}

export function isAdminLoggedIn() {
  const admin = getAdminUser();

  return !!(
    admin &&
    admin.role === "admin" &&
    admin.two_factor_verified === true
  );
}