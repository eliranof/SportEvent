import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import homeBg from "../assets/img/homepage2.png";

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

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setUser(getSavedUser());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleStorageChange = () => {
      setUser(getSavedUser());
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const profileData = useMemo(() => {
    if (!user) {
      return null;
    }

    return {
      id: user.id || "",
      username: user.username || "",
      fullName: user.fullName || user.full_name || "",
      address: user.address || user.home_address || "",
      email: user.email || "",
      phone: user.phone || "",
    };
  }, [user]);

  const displayName = useMemo(() => {
    if (!profileData) {
      return "";
    }

    return profileData.username || "משתמש";
  }, [profileData]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    navigate("/");
  };

  const handleEditProfile = () => {
    setMenuOpen(false);
    navigate("/edit-profile");
  };

  const handleOpenPersonalArea = () => {
    setMenuOpen(false);
    navigate("/personal-area");
  };

  return (
    <div
      className="home"
      style={{ backgroundImage: `url(${homeBg})` }}
      dir="rtl"
      lang="he"
    >
      <div className="home__overlay" />

      <header className="home__topbar">
        <div className="home__section home__section--left" ref={menuRef}>
          {profileData ? (
            <div className="home__accountWrap">
              <button
                type="button"
                className="home__accountBtnWelcome"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="תפריט משתמש"
                title="תפריט משתמש"
                style={{
                  minHeight: "76px",
                  padding: "12px 22px",
                  gap: "14px",
                }}
              >
                <span
                  className="home__iconCircle"
                  style={{
                    width: "46px",
                    height: "46px",
                  }}
                >
                  <svg
                    className="home__iconSvg"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    style={{
                      width: "24px",
                      height: "24px",
                    }}
                  >
                    <path
                      d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 21C4.8 17.9 7.8 16 12 16C16.2 16 19.2 17.9 20 21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <span className="home__welcomeMini">
                  <span
                    className="home__welcomeLabel"
                    style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      color: "#ffffff",
                      lineHeight: "1.1",
                    }}
                  >
                    ברוך הבא
                  </span>
                  <span
                    className="home__welcomeName"
                    style={{
                      fontSize: "24px",
                      fontWeight: "900",
                      lineHeight: "1.05",
                      color: "#ffffff",
                    }}
                  >
                    {displayName}
                  </span>
                </span>
              </button>

              {menuOpen && (
                <div className="home__dropdown">
                  <div className="home__dropdownTitle">אזור אישי</div>

                  <div className="home__dropdownLine">
                    <span className="home__dropdownLabel">שם מלא</span>
                    <span className="home__dropdownValue">
                      {profileData.fullName || "לא הוזן"}
                    </span>
                  </div>

                  <div className="home__dropdownLine">
                    <span className="home__dropdownLabel">שם משתמש</span>
                    <span className="home__dropdownValue">
                      {profileData.username || "לא הוזן"}
                    </span>
                  </div>

                  <div className="home__dropdownLine">
                    <span className="home__dropdownLabel">כתובת מגורים</span>
                    <span className="home__dropdownValue">
                      {profileData.address || "לא הוזנה"}
                    </span>
                  </div>

                  <div className="home__dropdownLine">
                    <span className="home__dropdownLabel">דוא״ל</span>
                    <span className="home__dropdownValue">
                      {profileData.email || "לא הוזן"}
                    </span>
                  </div>

                  <div className="home__dropdownLine">
                    <span className="home__dropdownLabel">טלפון</span>
                    <span className="home__dropdownValue">
                      {profileData.phone || "לא הוזן"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="home__dropdownBtn"
                    onClick={handleOpenPersonalArea}
                  >
                    מעבר לאזור האישי
                  </button>

                  <button
                    type="button"
                    className="home__dropdownBtn"
                    onClick={handleEditProfile}
                  >
                    עריכת פרטים
                  </button>

                  <button
                    type="button"
                    className="home__dropdownBtn home__dropdownBtn--logout"
                    onClick={handleLogout}
                  >
                    התנתק
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              className="home__brand"
              onClick={() => navigate("/")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigate("/");
                }
              }}
            >
              SportEvent
            </div>
          )}
        </div>

        <nav
          className={`home__nav ${profileData ? "home__nav--logged" : ""}`}
          aria-label="תפריט ראשי"
        >
          <button
            type="button"
            className="home__navBtn"
            onClick={() => navigate("/events/near")}
          >
            אירועים קרובים
          </button>

          <button
            type="button"
            className="home__navBtn"
            onClick={() => navigate("/events/must-see")}
          >
            אירועים שאסור לפספס
          </button>

          <button
            type="button"
            className="home__navBtn"
            onClick={() => navigate("/events/sold-out")}
          >
            אירועי Sold out
          </button>

          {profileData && (
            <button
              type="button"
              className="home__navBtn"
              onClick={() => navigate("/my-saved-events")}
            >
              אירועים שמורים
            </button>
          )}

          {profileData && (
            <button
              type="button"
              className="home__navBtn home__navBtn--orders"
              onClick={() => navigate("/my-orders")}
            >
              סל ההזמנות שלי
            </button>
          )}

          {profileData && (
            <button
              type="button"
              className="home__navBtn"
              onClick={() => navigate("/personal-area")}
            >
              אזור אישי
            </button>
          )}

          <button
            type="button"
            className="home__navBtn"
            onClick={() => navigate("/contact")}
          >
            צור קשר
          </button>
        </nav>

        <div className="home__section home__section--right">
          {profileData ? (
            <div
              className="home__brand"
              onClick={() => navigate("/")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigate("/");
                }
              }}
            >
              SportEvent
            </div>
          ) : (
            <div className="home__guestActions">
              <button
                type="button"
                className="home__authBtn home__authBtn--ghost"
                onClick={() => navigate("/login")}
              >
                התחברות
              </button>

              <button
                type="button"
                className="home__authBtn"
                onClick={() => navigate("/register")}
              >
                הרשמה
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}