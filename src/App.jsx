import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Password = lazy(() => import("./pages/Password"));
const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const Chat = lazy(() => import("./pages/Chat"));
const Placement = lazy(() => import("./pages/Placement"));
const Project = lazy(() => import("./pages/Project"));
const Clubs = lazy(() => import("./pages/Clubs"));

function App() {
  return (
    <Router>
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/sign-up" element={<Signup />} />
        <Route path="/Password" element={<Password />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Chat" element={<Chat />} />
        <Route path="/Placement" element={<Placement />} />
        <Route path="/Project" element={<Project />} />
        <Route path="/Clubs" element={<Clubs />} />
      </Routes>
    </Suspense>
    </Router>
  );
}

export default App;
