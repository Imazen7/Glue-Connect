import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
  updateDoc,
  where,
  addDoc,
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

const Chat = () => {
  const user = auth.currentUser;
  const location = useLocation();
  const targetUid = location.state?.targetUid || null;
  const [me, setMe] = useState(null);
  const [meReady, setMeReady] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const [otherOnline, setOtherOnline] = useState(false);
  const [inCall, setInCall] = useState(false);
  const presenceUnsubRef = useRef(null);
  const msgsUnsubRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const wsRef = useRef(null);
  const autoOpenDoneRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        if (!cancelled) setMe(snap.exists() ? { uid: user.uid, ...snap.data() } : null);
      } catch (err) {
        console.error("Failed to load my profile:", err);
      } finally {
        if (!cancelled) setMeReady(true);
      }
    })();
    return () => (cancelled = true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "presence", user.uid);
    const markOnline = async () => {
      try {
        await setDoc(ref, { online: true, lastSeen: serverTimestamp() }, { merge: true });
      } catch {}
    };
    const markOffline = async () => {
      try {
        await setDoc(ref, { online: false, lastSeen: serverTimestamp() }, { merge: true });
      } catch {}
    };
    markOnline();
    const onVis = () => (document.visibilityState === "visible" ? markOnline() : markOffline());
    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", onVis);
      markOffline();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecentChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const doSearch = async (e) => {
    e?.preventDefault();
    const qStr = normalize(search);
    if (!qStr) {
      setResults([]);
      return;
    }
    try {
      const nameQ = query(
        collection(db, "profiles"),
        where("nameLower", ">=", qStr),
        where("nameLower", "<=", qStr + "\uf8ff")
      );
      const [nameSnap, usnSnap] = await Promise.all([
        getDocs(nameQ),
        getDocs(query(collection(db, "profiles"), where("usnLower", "==", qStr))),
      ]);

      const list = [];
      const seen = new Set();

      nameSnap.forEach((d) => {
        if (d.id === user.uid) return;
        const data = d.data();
        if (!hasRequiredProfile(data)) return;
        seen.add(d.id);
        list.push({ uid: d.id, ...data });
      });

      usnSnap.forEach((d) => {
        if (d.id === user.uid) return;
        if (seen.has(d.id)) return;
        const data = d.data();
        if (!hasRequiredProfile(data)) return;
        list.push({ uid: d.id, ...data });
      });

      setResults(list);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    }
  };

  const getChatIdFor = (a, b) => [a, b].sort().join("__");

  const openChatWith = async (other) => {
    if (!user) return;
    if (!hasRequiredProfile(me)) {
      alert("Please complete your profile before chatting.");
      return;
    }
    if (!hasRequiredProfile(other)) {
      alert("This user hasn't completed their profile yet.");
      return;
    }

    presenceUnsubRef.current?.();
    msgsUnsubRef.current?.();
    presenceUnsubRef.current = null;
    msgsUnsubRef.current = null;
    setMessages([]);

    const id = getChatIdFor(user.uid, other.uid);
    const chatRef = doc(db, "chats", id);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        participants: [user.uid, other.uid],
        participantNames: {
          [user.uid]: me?.name || "",
          [other.uid]: other.name || "",
        },
        lastMessage: "",
        updatedAt: serverTimestamp(),
      });
    }

    setSelected(other);
    setChatId(id);

    if (!targetUid) localStorage.setItem("lastChatId", id);

    const presRef = doc(db, "presence", other.uid);
    try {
      const presSnap = await getDoc(presRef);
      setOtherOnline(Boolean(presSnap.data()?.online));
    } catch {}
    presenceUnsubRef.current = onSnapshot(presRef, (s) => setOtherOnline(Boolean(s.data()?.online)));

    const mRef = query(collection(db, "chats", id, "messages"), orderBy("createdAt", "asc"));
    msgsUnsubRef.current = onSnapshot(mRef, (snap) => {
      const msgs = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !chatId || !user) return;
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      await addDoc(msgRef, {
        from: user.uid,
        text: newMsg.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: newMsg.trim(),
        updatedAt: serverTimestamp(),
      });
      setNewMsg("");
    } catch (err) {
      console.error("sendMessage failed:", err);
    }
  };

  const leaveChat = () => {
    presenceUnsubRef.current?.();
    msgsUnsubRef.current?.();
    presenceUnsubRef.current = null;
    msgsUnsubRef.current = null;
    setSelected(null);
    setChatId(null);
    setMessages([]);
    localStorage.removeItem("lastChatId");
    endCall();
  };

  useEffect(() => {
    if (!user || !meReady) return;
    if (autoOpenDoneRef.current) return;

    (async () => {
      try {
        if (targetUid) {
          const snap = await getDoc(doc(db, "profiles", targetUid));
          if (snap.exists()) await openChatWith({ uid: targetUid, ...snap.data() });
        } else {
          const lastChatId = localStorage.getItem("lastChatId");
          if (lastChatId) {
            const chatSnap = await getDoc(doc(db, "chats", lastChatId));
            if (!chatSnap.exists()) return;
            const otherUid = chatSnap.data().participants.find((p) => p !== user.uid);
            const otherSnap = await getDoc(doc(db, "profiles", otherUid));
            if (!otherSnap.exists()) return;
            await openChatWith({ uid: otherUid, ...otherSnap.data() });
          }
        }
      } catch (err) {
        console.error("Auto-open chat failed:", err);
      } finally {
        autoOpenDoneRef.current = true;
      }
    })();
  }, [user, meReady, targetUid]);

  useEffect(() => {
    return () => {
      presenceUnsubRef.current?.();
      msgsUnsubRef.current?.();
      endCall();
      try { wsRef.current?.close(); } catch {}
    };
  }, []);

  const meBlocked = useMemo(() => meReady && !hasRequiredProfile(me), [me, meReady]);

  const ensurePC = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] });

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate && wsRef.current && selected) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          to: selected.uid,
          from: user.uid,
          candidate: ev.candidate,
          chatId,
        }));
      }
    };
    pcRef.current = pc;
    return pc;
  };

  const connectWS = () => {
    if (wsRef.current) return wsRef.current;
    const ws = new WebSocket("https://glue-connect-server-z7eb.onrender.com");
    ws.onopen = () => ws.send(JSON.stringify({ type: "hello", uid: user.uid }));
    ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data || "{}");
      if (msg.to !== user.uid) return;
      const pc = ensurePC();
      try {
        if (msg.type === "offer") {
          await pc.setRemoteDescription(msg.sdp);
          if (!localStreamRef.current) {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = s;
            s.getTracks().forEach((t) => pc.addTrack(t, s));
          }
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          ws.send(JSON.stringify({ type: "answer", to: msg.from, from: user.uid, sdp: pc.localDescription, chatId }));
          setInCall(true);
        } else if (msg.type === "answer") {
          await pc.setRemoteDescription(msg.sdp);
        } else if (msg.type === "ice-candidate") {
          await pc.addIceCandidate(msg.candidate).catch(() => {});
        } else if (msg.type === "hangup") {
          endCall();
        }
      } catch (err) {
        console.error("WS message handling error:", err);
      }
    };
    ws.onclose = () => (wsRef.current = null);
    ws.onerror = (e) => console.error("Signaling WS error:", e);
    wsRef.current = ws;
    return ws;
  };

  const startCall = async () => {
    if (!selected) return alert("Select a user first.");
    if (!otherOnline) return alert("User must be online to start an audio call.");
    const pc = ensurePC();
    connectWS();
    if (!localStreamRef.current) {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = s;
      s.getTracks().forEach((t) => pc.addTrack(t, s));
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    wsRef.current?.send(JSON.stringify({ type: "offer", to: selected.uid, from: user.uid, sdp: pc.localDescription, chatId }));
    setInCall(true);
  };

  const endCall = () => {
    setInCall(false);
    try { wsRef.current?.send(JSON.stringify({ type: "hangup", to: selected?.uid, from: user.uid, chatId })); } catch {}
    try { pcRef.current?.getSenders()?.forEach((s) => s.track && s.track.stop()); pcRef.current?.close(); } catch {}
    pcRef.current = null;
    if (localStreamRef.current) localStreamRef.current.getTracks()?.forEach((t) => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current?.srcObject) remoteAudioRef.current.srcObject = null;
  };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h1 className="text-2xl font-bold text-[#3F7D58] text-center">Chat</h1>
        </div>

        {meBlocked && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
            Complete your profile (Name, Description, Role{me?.role === "Student" ? ", USN & Phone" : ""}) to chat with others.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-4">
            <form onSubmit={doSearch} className="bg-white rounded-lg shadow p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or USN…"
                  className="flex-1 border rounded p-2"
                  disabled={meBlocked}
                />
                <button className="bg-[#3F7D58] text-white px-4 rounded disabled:opacity-50" disabled={meBlocked}>
                  Search
                </button>
              </div>
              <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                {results.length === 0 && search && <div className="text-sm text-gray-500">User doesn’t exist.</div>}
                {results.map((r) => (
                  <button
                    key={r.uid}
                    type="button"
                    onClick={() => openChatWith(r)}
                    className="w-full text-left border rounded p-2 hover:bg-gray-50"
                  >
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.role || "—"} {r.usn ? `| ${r.usn}` : ""}</div>
                  </button>
                ))}
              </div>
            </form>

            <div className="bg-white rounded-lg shadow p-3">
              <div className="font-semibold mb-2">Recent Chats</div>
              <div className="space-y-1 max-h-64 overflow-auto">
                {recentChats.length === 0 && <div className="text-sm text-gray-500">No chats yet.</div>}
                {recentChats.map((c) => {
                  const otherUid = c.participants.find((p) => p !== user.uid);
                  const otherName = c.participantNames?.[otherUid] || "Unknown";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={async () => {
                        const otherSnap = await getDoc(doc(db, "profiles", otherUid));
                        if (otherSnap.exists()) openChatWith({ uid: otherUid, ...otherSnap.data() });
                      }}
                      className="w-full text-left border rounded p-2 hover:bg-gray-50"
                    >
                      <div className="font-medium">{otherName}</div>
                      <div className="text-xs text-gray-500 truncate">{c.lastMessage || "…"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Select a user to start chatting.</div>
            ) : (
              <div className="bg-white rounded-lg shadow flex flex-col h-[70vh]">
                <div className="border-b p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{selected.name}</div>
                    <div className={`text-xs ${otherOnline ? "text-green-600" : "text-gray-500"}`}>{otherOnline ? "Online" : "Offline"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={startCall} disabled={!otherOnline} className="px-3 py-1 rounded text-white disabled:opacity-50" style={{ backgroundColor: "#3F7D58" }}>
                      Audio Call
                    </button>
                    <button onClick={leaveChat} className="px-3 py-1 rounded border">Leave</button>
                  </div>
                </div>

                {inCall && (
                  <div className="p-3 border-b flex flex-col items-center">
                    <p className="text-sm text-gray-600 mb-2">In audio call…</p>
                    <audio ref={remoteAudioRef} autoPlay />
                    <button onClick={endCall} className="border rounded px-3 py-1 mt-2">End Call</button>
                  </div>
                )}

                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className={`max-w-[70%] p-2 rounded ${m.from === user.uid ? "ml-auto bg-[#e7f3ec]" : "mr-auto bg-gray-100"}`}>{m.text}</div>
                  ))}
                </div>

                <div className="border-t p-3 flex gap-2">
                  <input
                    className="flex-1 border rounded p-2"
                    placeholder="Type a message…"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button onClick={sendMessage} className="px-4 rounded text-white" style={{ backgroundColor: "#3F7D58" }}>
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;
