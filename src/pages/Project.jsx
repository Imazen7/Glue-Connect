import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const hasRequiredProfile = (p) => {
  if (!p) return false;
  if (!p.name || !p.description || !p.role) return false;

  if (p.role === "Student") {
    return !!p.usn && /^\d{10}$/.test(String(p.phone || ""));
  }

  return true;
};

const Project = () => {
  const user = auth.currentUser;
  const [me, setMe] = useState(null);
  const [meReady, setMeReady] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const navigate = useNavigate();
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        if (snap.exists()) {
          setMe({ uid: user.uid, ...snap.data() });
        }
      } finally {
        setMeReady(true);
      }
    })();
  }, [user]);
  const doSearch = async (e) => {
    e?.preventDefault();
    const qStr = search.trim().toLowerCase();
    if (!qStr) {
      setResults([]);
      return;
    }
    const skillTerms = qStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    if (skillTerms.length === 0) {
      setResults([]);
      return;
    }

    const snap = await getDocs(collection(db, "profiles"));
    const list = [];
    snap.forEach((d) => {
      if (d.id === user.uid) return; // skip self
      const data = d.data();
      if (!hasRequiredProfile(data)) return;
      const profileSkills = (data.skills || []).map((s) => s.toLowerCase());
      const match = skillTerms.every((term) =>
        profileSkills.some((s) => s.includes(term))
      );
      if (match) {
        list.push({ uid: d.id, ...data });
      }
    });

    setResults(list);
  };

  const meBlocked = useMemo(
    () => meReady && !hasRequiredProfile(me),
    [me, meReady]
  );

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <h1 className="text-2xl font-bold text-center text-[#3F7D58]">
            Project Collaboration
          </h1>
        </div>

        {meBlocked ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
            You must complete your profile (Name, Description, Role,{" "}
            {me?.role === "Student" ? "USN, Phone" : "Phone (optional)"}) to use
            the project search.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-4">
            {!selectedProfile ? (
              <>
                <form
                  onSubmit={doSearch}
                  className="flex flex-col md:flex-row gap-2"
                >
                  <input
                    type="text"
                    placeholder="Search by required skills (e.g. React, Node)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 border rounded p-2"
                  />
                  <button
                    type="submit"
                    className="bg-[#3F7D58] text-white px-4 py-2 rounded hover:bg-green-800"
                  >
                    Search
                  </button>
                </form>
                <div className="mt-4 space-y-2 max-h-[60vh] overflow-auto">
                  {results.length === 0 && search && (
                    <div className="text-gray-500 text-sm">
                      No matching profiles found.
                    </div>
                  )}
                  {results.map((r) => (
                    <button
                      key={r.uid}
                      onClick={() => setSelectedProfile(r)}
                      className="w-full text-left border rounded p-3 hover:bg-gray-50"
                    >
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-sm text-gray-500">
                        {r.role} {r.usn ? `| ${r.usn}` : ""}
                      </div>
                      {r.skills?.length > 0 && (
                        <div className="text-s text-gray-400 mt-1">
                          Skills: {r.skills.join(", ")}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-4 border rounded bg-gray-50">
                  <h2 className="text-xl font-bold mb-2">
                    {selectedProfile.name}
                  </h2>
                  <p className="text-gray-700 mb-1">
                    <span className="font-semibold">Role:</span>{" "}
                    {selectedProfile.role}
                  </p>
                  {selectedProfile.usn && (
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">USN:</span>{" "}
                      {selectedProfile.usn}
                    </p>
                  )}
                  {selectedProfile.email && (
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Email:</span>{" "}
                      {selectedProfile.email}
                    </p>
                  )}
                  {selectedProfile.phone && (
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Phone:</span>{" "}
                      {selectedProfile.phone}
                    </p>
                  )}
                  <p className="text-gray-700 mb-1">
                    <span className="font-semibold">Description:</span>{" "}
                    {selectedProfile.description}
                  </p>
                  {selectedProfile.about && (
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">About:</span>{" "}
                      {selectedProfile.about}
                    </p>
                  )}
                  {selectedProfile.skills?.length > 0 && (
                    <div className="mt-2">
                      <span className="font-semibold">Skills: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedProfile.skills.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-[#3F7D58] text-white rounded-full text-s"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 space-y-1">
                    {selectedProfile.linkedin && (
                      <a
                        href={selectedProfile.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline text-lg block"
                      >
                        LinkedIn
                      </a>
                    )}
                    {selectedProfile.github && (
                      <a
                        href={selectedProfile.github}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline text-lg block"
                      >
                        GitHub
                      </a>
                    )}
                    {selectedProfile.portfolio && (
                      <a
                        href={selectedProfile.portfolio}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline text-lg block"
                      >
                        Portfolio
                      </a>
                    )}
                    {selectedProfile.resume && (
                      <a
                        href={selectedProfile.resume}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline text-lg block"
                      >
                        Resume
                      </a>
                    )}
                  </div>
                </div>
                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() =>
                      navigate("/chat", {
                        state: { targetUid: selectedProfile.uid },
                      })
                    }
                    className="bg-[#3F7D58] text-white px-4 py-2 rounded hover:bg-green-800"
                  >
                    Chat with {selectedProfile.name}
                  </button>
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    ← Back to Search
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Project;
