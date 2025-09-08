import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import { auth, db } from "../firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const hasRequiredProfile = (p) => {
  if (!p) return false;
  if (!p.name || !p.description || !p.role) return false;

  if (p.role === "Student") {
    return !!p.usn && /^\d{10}$/.test(String(p.phone || ""));
  }
  return true;
};

const Placement = () => {
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
    const q = search.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    const list = [];

    const qName = query(
      collection(db, "profiles"),
      where("nameLower", ">=", q),
      where("nameLower", "<=", q + "\uf8ff")
    );
    const snapName = await getDocs(qName);
    snapName.forEach((d) => {
      if (hasRequiredProfile(d.data())) {
        list.push({ uid: d.id, ...d.data() });
      }
    });

const qUsn = query(
  collection(db, "profiles"),
  where("usnLower", "==", search.trim().toLowerCase())
);
const snapUsn = await getDocs(qUsn);
snapUsn.forEach((d) => {
  if (hasRequiredProfile(d.data()) && !list.find((x) => x.uid === d.id)) {
    list.push({ uid: d.id, ...d.data() });
  }
});
    setResults(list);
  };

  const meBlocked = useMemo(() => meReady && !hasRequiredProfile(me), [me, meReady]);

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <h1 className="text-2xl font-bold text-center text-[#3F7D58]">
            Placement Page
          </h1>
        </div>

        {meBlocked ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
            You must complete your profile (Name, Description, Role,{" "}
            {me?.role === "Student" ? "USN, Phone" : "Phone (optional)"}) to use the placement search.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-4">
            {!selectedProfile ? (
              <>
                <form onSubmit={doSearch} className="flex flex-col md:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Search by name or USN..."
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
                    <div className="text-gray-500 text-sm">No matching profiles found.</div>
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
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-4 border rounded bg-gray-50">
                  <h2 className="text-xl font-bold mb-2">{selectedProfile.name}</h2>
                  <p className="text-gray-700 mb-1"><span className="font-semibold">Role:</span> {selectedProfile.role}</p>
                  {selectedProfile.usn && <p className="text-gray-700 mb-1"><span className="font-semibold">USN:</span> {selectedProfile.usn}</p>}
                  <p className="text-gray-700 mb-1"><span className="font-semibold">Email:</span> {selectedProfile.email}</p>
                  {selectedProfile.phone && <p className="text-gray-700 mb-1"><span className="font-semibold">Phone:</span> {selectedProfile.phone}</p>}
                  <p className="text-gray-700 mb-1"><span className="font-semibold">Description:</span> {selectedProfile.description}</p>
                  {selectedProfile.about && <p className="text-gray-700 mb-1"><span className="font-semibold">About:</span> {selectedProfile.about}</p>}
                  {selectedProfile.skills?.length > 0 && (
                    <div className="mt-2">
                      <span className="font-semibold">Skills: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedProfile.skills.map((s, i) => (
                          <span key={i} className="px-2 py-1 bg-[#3F7D58] text-white rounded-full text-s">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 space-y-1">
                    {selectedProfile.linkedin && (
                      <a href={selectedProfile.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline text-lg block">
                        LinkedIn
                      </a>
                    )}
                    {selectedProfile.github && (
                      <a href={selectedProfile.github} target="_blank" rel="noreferrer" className="text-blue-600 underline text-lg block">
                        GitHub
                      </a>
                    )}
                    {selectedProfile.portfolio && (
                      <a href={selectedProfile.portfolio} target="_blank" rel="noreferrer" className="text-blue-600 underline text-lg block">
                        Portfolio
                      </a>
                    )}
                    {selectedProfile.resume && (
                      <a href={selectedProfile.resume} target="_blank" rel="noreferrer" className="text-blue-600 underline text-lg block">
                        Resume
                      </a>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => navigate("/chat", { state: { targetUid: selectedProfile.uid } })}
                      className="bg-[#3F7D58] text-white px-4 py-2 rounded hover:bg-green-800"
                    >
                      💬 Chat with {selectedProfile.name}
                    </button>
                    <button
                      onClick={() => setSelectedProfile(null)}
                      className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                      ← Back to Search
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Placement;
