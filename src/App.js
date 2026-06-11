import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SetPasswordPage from "./pages/SetPasswordPage";
import VerifyChoicePage from "./pages/VerifyChoicePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import NearEventsPage from "./pages/NearEventsPage";
import AllUpcomingEventsPage from "./pages/AllUpcomingEventsPage";
import EditProfilePage from "./pages/EditProfilePage";
import IsraelEventsPage from "./pages/IsraelEventsPage";
import WorldEventsPage from "./pages/WorldEventsPage";
import MustSeeEventsPage from "./pages/MustSeeEventsPage";
import WorldCupMustSeePage from "./pages/WorldCupMustSeePage";
import FinalFourMustSeePage from "./pages/FinalFourMustSeePage";
import GrandSlamMustSeePage from "./pages/GrandSlamMustSeePage";
import SoldOutEventsPage from "./pages/SoldOutEventsPage";
import SoldOutWaitlistPage from "./pages/SoldOutWaitlistPage";
import SoldOutWaitlistNextPage from "./pages/SoldOutWaitlistNextPage";
import OfferPurchasePage from "./pages/OfferPurchasePage";
import ContactV2Page from "./pages/ContactV2Page";
import GuestContactPage from "./pages/GuestContactPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import MySavedEventsPage from "./pages/MySavedEventsPage";
import PurchaseTicketsPage from "./pages/PurchaseTicketsPage";
import PurchaseNextPage from "./pages/PurchaseNextPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import PersonalAreaPage from "./pages/PersonalAreaPage";
import TravelPackagesPage from "./pages/TravelPackagesPage";

import AdminEventsPage from "./pages/AdminEventsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminVerify2FAPage from "./pages/AdminVerify2FAPage";
import AdminPricingInventoryPage from "./pages/AdminPricingInventoryPage";

import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import WaitlistOfferNotifier from "./components/WaitlistOfferNotifier";
import { warmEventsCache } from "./services/eventsService";

function clearOldPersistentLoginData() {
  localStorage.removeItem("user");

  localStorage.removeItem("adminUser");
  localStorage.removeItem("admin");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("pendingAdmin");
  localStorage.removeItem("pendingAdmin2FA");
}

function AppContent() {
  const [appReady] = useState(() => {
    clearOldPersistentLoginData();
    return true;
  });

  useEffect(() => {
    warmEventsCache().catch((error) => {
      console.error("warmEventsCache failed:", error);
    });
  }, []);

  if (!appReady) {
    return null;
  }

  return (
    <>
      <WaitlistOfferNotifier />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/register" element={<RegisterPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/verify" element={<VerifyChoicePage />} />

        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/my-saved-events" element={<MySavedEventsPage />} />
        <Route path="/personal-area" element={<PersonalAreaPage />} />

        <Route path="/events/near" element={<NearEventsPage />} />
        <Route path="/events/all-upcoming" element={<AllUpcomingEventsPage />} />
        <Route path="/events/israel" element={<IsraelEventsPage />} />
        <Route path="/events/world" element={<WorldEventsPage />} />
        <Route path="/events/must-see" element={<MustSeeEventsPage />} />
        <Route path="/events/must-see/world-cup" element={<WorldCupMustSeePage />} />
        <Route path="/events/must-see/final-four" element={<FinalFourMustSeePage />} />
        <Route path="/events/must-see/grand-slam" element={<GrandSlamMustSeePage />} />

        <Route path="/events/sold-out" element={<SoldOutEventsPage />} />
        <Route path="/events/sold-out/waitlist" element={<SoldOutWaitlistPage />} />

        <Route
          path="/events/sold-out/waitlist/next"
          element={<SoldOutWaitlistNextPage />}
        />

        <Route
          path="/events/sold-out/offer/:requestId"
          element={<OfferPurchasePage />}
        />

        <Route path="/event/:id" element={<EventDetailsPage />} />
        <Route path="/event/:id/package" element={<TravelPackagesPage />} />
        <Route path="/event/:id/seats" element={<SeatSelectionPage />} />

        <Route path="/purchase-tickets" element={<PurchaseTicketsPage />} />
        <Route path="/purchase-tickets/next" element={<PurchaseNextPage />} />

        <Route path="/contact" element={<ContactV2Page />} />
        <Route path="/contact/guest" element={<GuestContactPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/verify-2fa" element={<AdminVerify2FAPage />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/events"
          element={
            <ProtectedAdminRoute>
              <AdminEventsPage />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/pricing-inventory"
          element={
            <ProtectedAdminRoute>
              <AdminPricingInventoryPage />
            </ProtectedAdminRoute>
          }
        />

        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}