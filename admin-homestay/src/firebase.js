import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBAgasxRlpaRYPFK82oqM0vbJAJWo_cHVk",
  authDomain: "homestay-online.firebaseapp.com",
  databaseURL: "https://homestay-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "homestay-online",
  storageBucket: "homestay-online.firebasestorage.app",
  messagingSenderId: "86414057858",
  appId: "1:86414057858:web:021efca8b3e860e54def9b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);