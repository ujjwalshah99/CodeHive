import React, { Suspense, lazy } from "react";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import Home from "../pages/Home";
import Register from "../pages/Register";
import Login from "../pages/Login";
import UserAuth from "../auth/UserAuth";
const Project = lazy(() => import("../pages/Project"));

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserAuth><Home /></UserAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/project"
          element={
            <Suspense fallback={<div>Loading Project...</div>}>
              <UserAuth>
                <Project />
              </UserAuth>
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes