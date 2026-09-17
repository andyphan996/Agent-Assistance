import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { useState } from "react";
import Login from "./pages/Login";
import OnboardingTimezone from "./pages/OnboardingTimezone";
import OnboardingHabits from "./pages/OnboardingHabits";
import OnboardingConnect from "./pages/OnboardingConnect";
import Workspace from "./pages/Workspace";
import TestGemini from "./pages/TestGemini";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/test" element={<TestGemini />} />
        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
        {/* Onboarding Flow */}
        <Route path="/onboarding/1" element={<OnboardingTimezone />} />
        <Route path="/onboarding/2" element={<OnboardingHabits />} />
        <Route path="/onboarding/3" element={<OnboardingConnect />} />
        
        {/* Main Workspace */}
        <Route path="/" element={<Workspace />} />
        <Route path="/workspace" element={<Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
