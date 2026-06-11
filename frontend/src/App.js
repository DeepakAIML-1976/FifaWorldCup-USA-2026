import "@/App.css";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Fixtures from "@/pages/Fixtures";
import Awards from "@/pages/Awards";
import Leaderboard from "@/pages/Leaderboard";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import Stadiums from "@/pages/Stadiums";
import StadiumDetail from "@/pages/StadiumDetail";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";

function Shell() {
  const { pathname } = useLocation();
  const hideNav = pathname === "/login" || pathname === "/register";
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {!hideNav && <Navbar />}
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:name" element={<TeamDetail />} />
            <Route path="/stadiums" element={<Stadiums />} />
            <Route path="/stadiums/:name" element={<StadiumDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/awards" element={<ProtectedRoute><Awards /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
