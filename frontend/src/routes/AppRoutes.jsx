import React from "react";
import {Route , BrowserRouter , Routes} from "react-router-dom";
import Home from "../pages/Home";
import Register from "../pages/Register";
import Login from "../pages/Login";
import Project from "../pages/Project";
import UserAuth from "../auth/UserAuth";

function AppRoutes() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<UserAuth><Home/></UserAuth>}></Route>
            <Route path="/login" element={<Login></Login>}></Route>
            <Route path="/register" element={<Register></Register>}></Route>
            <Route path="/project" element={<UserAuth><Project/></UserAuth>}></Route>
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes