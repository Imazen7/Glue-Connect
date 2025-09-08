import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const Profile = () => {
  const user = auth.currentUser;
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    role: "",
    usn: "",
    about: "",
    skills: [],
    resume: "",
    linkedin: "",
    github: "",
    portfolio: "",
    email: "",
    phone: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const docRef = doc(db, "profiles", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData((prev) => ({
              ...prev,
              ...data,
              email: user.email,
            }));
            setProfileExists(true);
          } else {
            setFormData((prev) => ({
              ...prev,
              email: user.email,
            }));
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          alert("Error loading profile: " + error.message);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormData((prev) => ({
      ...prev,
      role,
      usn: role === "Student" ? prev.usn : "",
    }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() !== "") {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (index) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert("Name is required.");
      return false;
    }
    if (!formData.description.trim()) {
      alert("Description is required.");
      return false;
    }
    if (!formData.role) {
      alert("Role selection is required.");
      return false;
    }

    if (formData.role === "Student") {
      if (!formData.usn.trim()) {
        alert("USN/Registration Number is required for Students.");
        return false;
      }
      const phoneTrim = (formData.phone || "").trim();
      if (!/^\d{10}$/.test(phoneTrim)) {
        alert("Phone number must be exactly 10 digits.");
        return false;
      }
    }

    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!validateForm()) return;

    setSaving(true);

    try {
      const usnTrim = (formData.usn || "").trim();
      const phoneTrim = (formData.phone || "").trim();

      if (formData.role === "Student" && usnTrim) {
        const usnQ = query(
          collection(db, "profiles"),
          where("usn", "==", usnTrim)
        );
        const usnSnap = await getDocs(usnQ);
        if (!usnSnap.empty) {
          const conflict = usnSnap.docs.find((d) => d.id !== user.uid);
          if (conflict) {
            alert("This USN is already registered by another user.");
            setSaving(false);
            return;
          }
        }
      }

      if (phoneTrim) {
        const phoneQ = query(
          collection(db, "profiles"),
          where("phone", "==", phoneTrim)
        );
        const phoneSnap = await getDocs(phoneQ);
        if (!phoneSnap.empty) {
          const conflict = phoneSnap.docs.find((d) => d.id !== user.uid);
          if (conflict) {
            alert("This phone number is already registered by another user.");
            setSaving(false);
            return;
          }
        }
      }

      const profileData = {
        ...formData,
        email: user.email,
        nameLower: formData.name.trim().toLowerCase(),
        usnLower:
          formData.role === "Student" && usnTrim
            ? usnTrim.toLowerCase()
            : "",
        usn: usnTrim,
        phone: phoneTrim,
        lastUpdated: new Date().toISOString(),
      };

      await setDoc(doc(db, "profiles", user.uid), profileData, { merge: true });

      setProfileExists(true);
      alert("Profile has been successfully saved!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6 mt-8">
        <h1 className="text-2xl font-bold mb-6 text-[#3F7D58] text-center">
          Profile Information
        </h1>
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="block font-medium">Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Description *</label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Role *</label>
            <select
              id="role"
              value={formData.role}
              onChange={handleRoleChange}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Select Role</option>
              <option value="Student">Student</option>
              <option value="Professor">Professor</option>
              <option value="Placement">Placement Coordinator</option>
            </select>
          </div>
          {formData.role === "Student" && (
            <div>
              <label className="block font-medium">
                USN / Registration Number *
              </label>
              <input
                type="text"
                id="usn"
                value={formData.usn}
                onChange={handleChange}
                className="w-full border rounded p-2"
                required
              />
            </div>
          )}
          <div>
            <label className="block font-medium">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              className="w-full border rounded p-2 bg-gray-100 cursor-not-allowed"
              readOnly
            />
          </div>
          <div>
            <label className="block font-medium">
              Phone Number {formData.role === "Student" ? "*" : "(optional)"}
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border rounded p-2"
              placeholder="Enter 10-digit phone number"
              required={formData.role === "Student"}
            />
          </div>
          <div>
            <label className="block font-medium">About</label>
            <textarea
              id="about"
              value={formData.about}
              onChange={handleChange}
              className="w-full border rounded p-2"
              rows="4"
            />
          </div>
          <div>
            <label className="block font-medium">Skills</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                className="flex-grow border rounded p-2"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="bg-[#3F7D58] text-white px-4 rounded"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, i) => (
                <span
                  key={i}
                  className="bg-[#3F7D58] text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(i)}
                    className="ml-2 text-red-200 hover:text-red-400"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
          {["resume", "linkedin", "github", "portfolio"].map((field) => (
            <div key={field}>
              <label className="block font-medium capitalize">{field} Link</label>
              <input
                type="url"
                id={field}
                value={formData[field]}
                onChange={handleChange}
                placeholder={`https://${field}.com/username`}
                className="w-full border rounded p-2"
              />
            </div>
          ))}
          <div>
            <button
              type="submit"
              className="w-full bg-[#3F7D58] text-white py-2 rounded font-semibold hover:bg-green-800 disabled:opacity-50"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : profileExists
                ? "Update Profile"
                : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Profile;
