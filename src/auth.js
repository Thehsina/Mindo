import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Register a new user
export const registerUser = (email, password) => 
  createUserWithEmailAndPassword(auth, email, password);

// Login existing user
export const loginUser = (email, password) => 
  signInWithEmailAndPassword(auth, email, password);

// Logout
export const logoutUser = () => signOut(auth);