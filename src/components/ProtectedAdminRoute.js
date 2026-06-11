import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminLoggedIn } from "../services/adminAuthService";

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();

  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}