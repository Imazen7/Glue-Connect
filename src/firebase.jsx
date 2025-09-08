import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb_3JFVKC8yb0YxO16W95O705lPyzI8gI",
  authDomain: "glue-connect.firebaseapp.com",
  projectId: "glue-connect",
  storageBucket: "glue-connect.firebasestorage.app",
  messagingSenderId: "599841554879",
  appId: "1:599841554879:web:db4bd484555d86d5ec610a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);