import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        createdAt: new Date(),
      });

      navigate("/");
    } catch (error) {
      alert("Sign Up failed: " + error.message);
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
            Sign Up
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
                placeholder="Enter your password"
                className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-lg focus:ring-2 focus:ring-[#3F7D58] focus:outline-none text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium text-sm sm:text-base">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
                className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-lg focus:ring-2 focus:ring-[#3F7D58] focus:outline-none text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-[#3F7D58] text-white py-2 px-4 rounded-lg hover:bg-[#356a4c] transition text-sm sm:text-base"
              >
                Sign Up
              </button>
              <Link
                to="/"
                className="flex-1 text-center block bg-[#3F7D58] text-white py-2 px-4 rounded-lg hover:bg-[#356a4c] transition text-sm sm:text-base"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignUp;
