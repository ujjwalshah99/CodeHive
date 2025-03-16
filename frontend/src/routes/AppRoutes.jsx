import React from "react";
import {Route , BrowserRouter , Routes} from "react-router-dom";
import Home from "../pages/Home";
import Register from "../pages/Register";
import Login from "../pages/Login";
import Project from "../pages/Project";

function AppRoutes() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home></Home>}></Route>
            <Route path="/login" element={<Login></Login>}></Route>
            <Route path="/register" element={<Register></Register>}></Route>
            <Route path="/project" element={<Project></Project>}></Route>
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes