import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCj2s2JnUIGcO0XBSGnhSMRLxIGQ3ZuclY",
  authDomain: "task-manager-app-977f4.firebaseapp.com",
  projectId: "task-manager-app-977f4",
  storageBucket: "task-manager-app-977f4.firebasestorage.app",
  messagingSenderId: "282826351146",
  appId: "1:282826351146:web:dd7b4aa79f2490e8a6d953"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);




