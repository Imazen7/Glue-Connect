import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  where,
  deleteField,
} from "firebase/firestore";

const hasRequiredProfile = (p) => {
  if (!p) return false;
  if (!p.name || !p.description || !p.role) return false;
  if (p.role === "Student") {
    return !!p.usn && /^\d{10}$/.test(String(p.phone || ""));
  }
  return true;
};

const normalize = (s = "") => s.trim().toLowerCase();

export default function Clubs() {
  const user = auth.currentUser;

  const [me, setMe] = useState(null);
  const [meReady, setMeReady] = useState(false);

  const [clubs, setClubs] = useState([]);
  const [searchClub, setSearchClub] = useState("");
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const clubsUnsubRef = useRef(null);
  const msgsUnsubRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        if (!cancelled) setMe(snap.exists() ? { uid: user.uid, ...snap.data() } : null);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        if (!cancelled) setMeReady(true);
      }
    })();
    return () => (cancelled = true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "clubs"), orderBy("createdAt", "desc"));
    clubsUnsubRef.current = onSnapshot(
      q,
      (snap) => {
        setClubs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error("Clubs snapshot error:", err)
    );

    return () => clubsUnsubRef.current?.();
  }, [user]);

  const filteredClubs = useMemo(() => {
    const q = normalize(searchClub);
    if (!q) return clubs;
    return clubs.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [clubs, searchClub]);

  const handleCreateClub = async (e) => {
    e?.preventDefault();
    if (!user) return alert("Please sign in to create clubs.");
    if (!hasRequiredProfile(me)) return alert("Please complete your profile before creating a club.");
    const nameTrim = (clubName || "").trim();
    const descTrim = (clubDesc || "").trim();
    if (!nameTrim) return alert("Club name is required.");
    setCreating(true);
    try {
      const clubRef = doc(collection(db, "clubs"));
      await setDoc(clubRef, {
        name: nameTrim,
        description: descTrim,
        creatorUid: user.uid,
        creatorName: me?.name || "",
        members: [user.uid],
        memberNames: { [user.uid]: me?.name || "" },
        joinRequests: [],
        createdAt: serverTimestamp(), 
      });
      setClubName("");
      setClubDesc("");
      alert("Club created!");
    } catch (err) {
      console.error("Create club error", err);
      alert("Failed to create club: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const openClub = async (club) => {
    setSelectedClub(club);
    setMessages([]);

    msgsUnsubRef.current?.();
    const mQ = query(collection(db, "clubs", club.id, "messages"), orderBy("createdAt", "asc"));
    msgsUnsubRef.current = onSnapshot(
      mQ,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
      },
      (err) => console.error("Messages snapshot error:", err)
    );

    try {
      const fresh = await getDoc(doc(db, "clubs", club.id));
      if (fresh.exists()) setSelectedClub({ id: fresh.id, ...fresh.data() });
    } catch (err) {
      console.error("Failed to load club", err);
    }
  };

  const sendClubMessage = async () => {
    if (!selectedClub) return;
    if (!user) return;
    if (selectedClub.creatorUid !== user.uid) return alert("Only the club creator can send messages.");
    const txt = (newMsg || "").trim();
    if (!txt) return;
    try {
      await addDoc(collection(db, "clubs", selectedClub.id, "messages"), {
        from: user.uid,
        text: txt,
        createdAt: serverTimestamp(),
      });
      setNewMsg("");
    } catch (err) {
      console.error("Send message failed", err);
      alert("Failed to send message: " + err.message);
    }
  };

  const doUserSearch = async (qStr) => {
    const q = normalize(qStr);
    setUserResults([]);
    if (!q) return;
    try {
      const nameQ = query(
        collection(db, "profiles"),
        where("nameLower", ">=", q),
        where("nameLower", "<=", q + String.fromCharCode(0xf8ff))
      );
      const usnQ = query(collection(db, "profiles"), where("usnLower", "==", q));

      const [nameSnap, usnSnap] = await Promise.all([getDocs(nameQ), getDocs(usnQ)]);

      const list = [];
      const seen = new Set();

      nameSnap.forEach((d) => {
        if (d.id === user.uid) return; 
        const data = d.data();
        if (!hasRequiredProfile(data)) return;
        if (selectedClub?.members?.includes(d.id)) return;
        seen.add(d.id);
        list.push({ uid: d.id, ...data });
      });

      usnSnap.forEach((d) => {
        if (d.id === user.uid) return;
        if (seen.has(d.id)) return;
        const data = d.data();
        if (!hasRequiredProfile(data)) return;
        if (selectedClub?.members?.includes(d.id)) return;
        seen.add(d.id);
        list.push({ uid: d.id, ...data });
      });

      setUserResults(list);
    } catch (err) {
      console.error("User search failed", err);
    }
  };

  const addUserToClub = async (u) => {
    if (!selectedClub) return;
    if (selectedClub.creatorUid !== user.uid) return alert("Only the club creator can add members.");
    try {
      await updateDoc(doc(db, "clubs", selectedClub.id), {
        members: arrayUnion(u.uid),
        [`memberNames.${u.uid}`]: u.name,
      });
      const fresh = await getDoc(doc(db, "clubs", selectedClub.id));
      if (fresh.exists()) setSelectedClub({ id: fresh.id, ...fresh.data() });
      setUserResults((r) => r.filter((x) => x.uid !== u.uid));
    } catch (err) {
      console.error("Add user failed", err);
      alert("Failed to add user: " + err.message);
    }
  };

  const removeUserFromClub = async (uidToRemove) => {
    if (!selectedClub) return;
    if (selectedClub.creatorUid !== user.uid) return alert("Only the club creator can remove members.");
    if (uidToRemove === user.uid) return alert("Creator cannot remove themselves.");
    try {
      await updateDoc(doc(db, "clubs", selectedClub.id), {
        members: arrayRemove(uidToRemove),
        [`memberNames.${uidToRemove}`]: deleteField(),
      });
      const fresh = await getDoc(doc(db, "clubs", selectedClub.id));
      if (fresh.exists()) setSelectedClub({ id: fresh.id, ...fresh.data() });
    } catch (err) {
      console.error("Remove user failed", err);
      alert("Failed to remove user: " + err.message);
    }
  };

  const leaveClubAsMember = async () => {
    if (!selectedClub || !user) return;
    if (!selectedClub.members?.includes(user.uid)) return;
    if (selectedClub.creatorUid === user.uid)
      return alert("Creator cannot leave the club. Transfer ownership or delete the club (not implemented).");
    try {
      await updateDoc(doc(db, "clubs", selectedClub.id), {
        members: arrayRemove(user.uid),
        [`memberNames.${user.uid}`]: deleteField(),
      });
      const fresh = await getDoc(doc(db, "clubs", selectedClub.id));
      if (fresh.exists()) setSelectedClub({ id: fresh.id, ...fresh.data() });
    } catch (err) {
      console.error("Leave club failed", err);
      alert("Failed to leave club: " + err.message);
    }
  };

  const sendJoinRequest = async () => {
    if (!selectedClub || !user) return;
    if (!hasRequiredProfile(me)) return alert("Complete your profile to request to join a club.");
    if (selectedClub.members?.includes(user.uid)) return alert("You are already a member.");
    try {
      const already = (selectedClub.joinRequests || []).find((r) => r.uid === user.uid);
      if (already) return alert("You already requested to join.");
      await updateDoc(doc(db, "clubs", selectedClub.id), {
        joinRequests: arrayUnion({
          uid: user.uid,
          name: me?.name || "",
          requestedAt: Date.now(),
        }),
      });
      const fresh = await getDoc(doc(db, "clubs", selectedClub.id));
      if (fresh.exists()) setSelectedClub({ id: fresh.id, ...fresh.data() });
      alert("Join request sent.");
    } catch (err) {
      console.error("Join request failed", err);
      alert("Failed to send join request: " + err.message);
    }
  };

  const acceptJoinRequest = async (req) => {
    if (!selectedClub) return;
    if (selectedClub.creatorUid !== user.uid) return alert("Only creator can accept requests.");
    try {
      await updateDoc(doc(db, "clubs", selectedClub.id), {
        members: arrayUnion(req.uid),
        joinRequests: arrayRemove(req),
        [`memberNames.${req.uid}`]: req.name,
      });
      const fresh = await getDoc(doc(db, "clubs", selectedClub.id));
      if (fresh.exists()) setSelectedClub({ id: fresh.id, ...fresh.data() });
    } catch (err) {
      console.error("Accept request failed", err);
      alert("Failed to accept request: " + err.message);
    }
  };

  const rejectJoinRequest = async (req) => {
    if (!selectedClub) return;
    if (selectedClub.creatorUid !== user.uid) return alert("Only creator can reject requests.");
    try {
      await updateDoc(doc(db, "clubs", selectedClub.id), {
        joinRequests: arrayRemove(req),
      });
      const fresh = await getDoc(doc(db, "clubs", selectedClub.id));
      if (fresh.exists()) setSelectedClub({ id: fresh.id, ...fresh.data() });
    } catch (err) {
      console.error("Reject request failed", err);
      alert("Failed to reject request: " + err.message);
    }
  };

  useEffect(() => {
    return () => msgsUnsubRef.current?.();
  }, []);

  const amIMember = selectedClub?.members?.includes(user?.uid);
  const amICreator = selectedClub?.creatorUid === user?.uid;

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h1 className="text-2xl font-bold text-[#3F7D58] text-center">Clubs Page</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-3">
              <div className="font-semibold mb-2">Create Club</div>
              {!meReady ? (
                <div className="text-sm text-gray-500">Loading profile...</div>
              ) : !hasRequiredProfile(me) ? (
                <div className="text-sm text-red-600">Complete your profile to create a club.</div>
              ) : (
                <form onSubmit={handleCreateClub} className="space-y-2">
                  <input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Club name" className="w-full border rounded p-2" />
                  <input value={clubDesc} onChange={(e) => setClubDesc(e.target.value)} placeholder="Short description" className="w-full border rounded p-2" />
                  <button disabled={creating} className="w-full bg-[#3F7D58] text-white py-2 rounded">{creating ? "Creating..." : "Create"}</button>
                </form>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-3">
              <div className="font-semibold mb-2">Search Clubs</div>
              <input value={searchClub} onChange={(e) => setSearchClub(e.target.value)} placeholder="Search by club name..." className="w-full border rounded p-2 mb-3" />
              <div className="max-h-64 overflow-auto space-y-2">
                {filteredClubs.length === 0 && <div className="text-sm text-gray-500">No clubs found.</div>}
                {filteredClubs.map((c) => (
                  <button key={c.id} onClick={() => openClub(c)} className="w-full text-left border rounded p-2 hover:bg-gray-50">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-s text-gray-500 truncate">{c.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {!selectedClub ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Select a club to view details or create one.</div>
            ) : (
              <div className="bg-white rounded-lg shadow flex flex-col h-[70vh]">
                <div className="border-b p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg">{selectedClub.name}</div>
                      <div className="text-s text-gray-600">{selectedClub.description}</div>
                      <div className="text-s text-gray-500 mt-1">Created by {selectedClub.creatorName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{selectedClub.members?.length || 0} members</div>
                      {amICreator ? (
                        <div className="text-s text-green-600">You are the creator</div>
                      ) : amIMember ? (
                        <div className="text-s text-blue-600">Member</div>
                      ) : (
                        <div className="text-s text-gray-500">Not a member</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <div className="font-semibold mb-2">Members</div>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {(selectedClub.memberNames ? Object.entries(selectedClub.memberNames) : []).map(([uid, name]) => (
                          <div key={uid} className="flex items-center justify-between border rounded p-2">
                            <div className="text-sm">{name}</div>
                            <div className="text-s">
                              {amICreator && uid !== user.uid ? (
                                <button onClick={() => removeUserFromClub(uid)} className="text-red-600">Remove</button>
                              ) : uid === user.uid && !amICreator ? (
                                <button onClick={leaveClubAsMember} className="text-red-600">Leave</button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {amICreator && (
                      <div className="bg-gray-50 rounded p-3">
                        <div className="font-semibold mb-2">Join Requests</div>
                        <div className="space-y-2 max-h-48 overflow-auto">
                          {(selectedClub.joinRequests || []).length === 0 && <div className="text-sm text-gray-500">No requests.</div>}
                          {(selectedClub.joinRequests || []).map((r, i) => (
                            <div key={i} className="flex items-center justify-between border rounded p-2">
                              <div className="text-sm">{r.name}</div>
                              <div className="flex gap-2">
                                <button onClick={() => acceptJoinRequest(r)} className="text-green-600">Accept</button>
                                <button onClick={() => rejectJoinRequest(r)} className="text-red-600">Reject</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2 flex flex-col">
                    {amIMember ? (
                      <>
                        <div className="flex-1 overflow-auto p-2 space-y-2 border rounded mb-2 bg-white">
                          {messages.length === 0 && <div className="text-sm text-gray-500">No messages yet.</div>}
                          {messages.map((m) => (
                            <div key={m.id} className={`p-2 rounded ${m.from === user.uid ? "ml-auto bg-[#e7f3ec]" : "mr-auto bg-gray-100"}`}>{m.text}</div>
                          ))}
                        </div>

                        {amICreator ? (
                          <div className="flex gap-2">
                            <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Send a club message..." className="flex-1 border rounded p-2" onKeyDown={(e) => e.key === 'Enter' && sendClubMessage()} />
                            <button onClick={sendClubMessage} className="bg-[#3F7D58] text-white px-4 rounded">Send</button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Only the club creator can post messages in this club.</div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 border rounded text-sm text-gray-600">You must be a member to see club messages.</div>
                    )}

                    <div className="mt-3">
                      {amICreator ? (
                        <div className="space-y-2">
                          <div className="font-semibold">Add members</div>
                          <div className="flex gap-2">
                            <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search members by name or USN" className="flex-1 border rounded p-2" />
                            <button onClick={() => doUserSearch(userQuery)} className="bg-[#3F7D58] text-white px-4 rounded">Search</button>
                          </div>
                          <div className="max-h-40 overflow-auto mt-2 space-y-2">
                            {userResults.map((u) => (
                              <div key={u.uid} className="flex items-center justify-between border rounded p-2">
                                <div className="text-sm">{u.name}{u.usn ? ` | ${u.usn}` : ''}</div>
                                <button onClick={() => addUserToClub(u)} className="text-green-600">Add</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : amIMember ? (
                        <div className="flex gap-2 items-center">
                          <div className="text-sm">You are a member.</div>
                          <button onClick={leaveClubAsMember} className="text-red-600">Leave Club</button>
                        </div>
                      ) : (
                        <div>
                          <button onClick={sendJoinRequest} className="bg-[#3F7D58] text-white px-4 py-2 rounded">Request to Join</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
