import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const Password = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("This email is not registered. Please sign up first.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent! Check your email.");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <header className="bg-[#3F7D58] text-white text-center py-10 shadow-md">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
          Glue Connect
        </h1>
      </header>

      <div className="flex items-start justify-center min-h-[80vh] bg-gray-100 px-4">
        <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md md:max-w-lg mt-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6">
            Reset Password
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
                placeholder="Enter your registered email"
                className="w-full px-3 py-2 sm:px-4 sm:py-2 border rounded-lg focus:ring-2 focus:ring-[#3F7D58] focus:outline-none text-sm sm:text-base"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="submit"
                className="flex-1 bg-[#3F7D58] text-white py-2 px-4 rounded-lg hover:bg-[#356a4c] transition text-sm sm:text-base"
              >
                Send Reset Link
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

export default Password;
