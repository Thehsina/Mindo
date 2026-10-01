import { supabase } from "./supabase";

// Register a new user
export const registerUser = (email, password) => 
  supabase.auth.signUp({ email, password });

// Login existing user
export const loginUser = (email, password) => 
  supabase.auth.signInWithPassword({ email, password });

// Logout
export const logoutUser = () => supabase.auth.signOut();