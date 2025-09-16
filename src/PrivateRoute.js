// PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ isLoggedIn, role, requiredRole, children }) => {
  // Giriş yapılmamışsa login sayfasına yönlendir
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }
  // Gerekli role sahip değilse login sayfasına yönlendir
  //if (requiredRole && role !== requiredRole) {
   // return <Navigate to="/login" />;
//  }

  // Her şey uygunsa çocuk componenti render et
  return children;
};

export default PrivateRoute;
