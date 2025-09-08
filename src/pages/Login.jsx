import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

const MAX_ATTEMPTS = 3;
const LOCK_TIME = 10 * 60 * 1000; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const lockData = JSON.parse(localStorage.getItem("loginLock")) || null;
    if (lockData && lockData.lockedAt) {
      const elapsed = Date.now() - lockData.lockedAt;
      if (elapsed < LOCK_TIME) {
        setIsLocked(true);
        setRemainingTime(LOCK_TIME - elapsed);
      } else {
        localStorage.removeItem("loginLock");
      }
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isLocked && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1000) {
            setIsLocked(false);
            localStorage.removeItem("loginLock");
            clearInterval(timer);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, remainingTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocked) {
      alert(
        `Too many failed attempts. Try again in ${Math.ceil(
          remainingTime / 1000
        )} seconds.`
      );
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem("loginAttempts");
      navigate("/Home");
    } catch (error) {
      alert("Login failed. Please try again.");
      let attempts = parseInt(localStorage.getItem("loginAttempts") || "0") + 1;
      localStorage.setItem("loginAttempts", attempts);

      if (attempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setRemainingTime(LOCK_TIME);
        localStorage.setItem(
          "loginLock",
          JSON.stringify({ lockedAt: Date.now() })
        );
        alert("Too many failed attempts. All logins blocked for 10 minutes.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/Home");
    } catch (error) {
      console.error("Google Sign-in error:", error);
      alert("Google sign-in failed. Please try again.");
    }
  };

  return (
    <>
      <header className="bg-[#3F7D58] text-white text-center py-8 shadow-md">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
            Glue Connect
        </h1>
    </header>

     <div className="flex items-start justify-center min-h-[80vh] bg-gray-100 px-4">
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md md:max-w-lg mt-8">
         <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6">
         User Login
        </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium text-sm sm:text-base">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLocked}
                placeholder="Enter your email"
                className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-lg focus:ring-2 focus:ring-[#3F7D58] focus:outline-none text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium text-sm sm:text-base">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLocked}
                placeholder="Enter your password"
                className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-lg focus:ring-2 focus:ring-[#3F7D58] focus:outline-none text-sm sm:text-base"
              />
            </div>

            <div className="text-right">
              <Link
                to="/Password"
                className="text-xs sm:text-lg text-[#3F7D58] hover:underline"
              >
                Reset Password
              </Link>
            </div>

            <button
              type="submit"
              id="submit"
              disabled={isLocked}
              className="w-full bg-[#3F7D58] text-white py-2 rounded-lg hover:bg-[#356a4c] transition text-sm sm:text-base"
            >
              Login
            </button>
          </form>

          {isLocked && (
            <p className="text-red-500 text-center mt-4 text-sm sm:text-base">
              Login blocked. Try again in {Math.ceil(remainingTime / 1000)}{" "}
              seconds.
            </p>
          )}

          <p className="text-center mt-6 text-gray-600 text-sm sm:text-base">
            Don’t have an account?{" "}
            <Link
              to="/sign-up"
              className="text-[#3F7D58] font-medium hover:underline"
            >
              Sign Up
            </Link>
          </p>

          <div className="flex items-center my-6">
            <hr className="flex-1 border-gray-300" />
            <span className="px-3 text-gray-500 text-sm sm:text-base">OR</span>
            <hr className="flex-1 border-gray-300" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 py-2 rounded-lg hover:bg-gray-100 transition text-sm sm:text-base"
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="w-4 h-4 sm:w-5 sm:h-5"
            />
            Continue with Google
          </button>
        </div>
      </div>
    </>
  );
};

export default Login;
