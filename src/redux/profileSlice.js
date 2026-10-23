// src/redux/profileSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase";

const isMissingProfileTable = (err) => {
  const message = String(err?.message || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("column")
  );
};

export const fetchUserProfile = createAsyncThunk(
  "profile/fetchUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      if (!isSupabaseConfigured || !supabase) {
        const localProfile = localStorage.getItem("tm.profile");
        const p = localProfile ? JSON.parse(localProfile) : {};
        const localUser = localStorage.getItem("tm.local_user");
        const u = localUser ? JSON.parse(localUser) : {};

        return {
          full_name: p.full_name || u.user_metadata?.display_name || "Local User",
          email: p.email || u.email || "local@example.com",
          avatar_url: p.avatar_url || u.user_metadata?.avatar_url || "",
        };
      }

      const user = await getCurrentUser();
      if (!user) return rejectWithValue("No active user session.");

      let dbAvatar = "";
      let dbName = "";
      let dbEmail = user.email || "";

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          dbName = data.full_name || "";
          dbEmail = data.email || dbEmail;
          dbAvatar = data.avatar_url || "";
        }
      } catch (err) {
        if (!isMissingProfileTable(err)) {
          console.debug("Non-fatal profile fetch warning:", err);
        }
      }

      // Supabase Auth metadata serves as reliable fallback/primary store
      const metaName = user.user_metadata?.display_name || user.user_metadata?.full_name || "";
      const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";

      // Also check cached local profile
      let localAvatar = "";
      try {
        const localP = localStorage.getItem("tm.profile");
        if (localP) {
          const parsed = JSON.parse(localP);
          localAvatar = parsed.avatar_url || "";
        }
      } catch (_) {}

      return {
        full_name: dbName || metaName || "User",
        email: dbEmail,
        avatar_url: dbAvatar || metaAvatar || localAvatar || "",
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load profile.");
    }
  }
);

export const saveUserProfile = createAsyncThunk(
  "profile/saveUserProfile",
  async ({ full_name, avatar_url }, { getState, rejectWithValue }) => {
    try {
      const state = getState().profile;
      const cleanName = (full_name !== undefined ? full_name : state.full_name).trim();
      const cleanAvatar = avatar_url !== undefined ? avatar_url : state.avatar_url;

      // 1. Always update local cache for instant offline responsiveness & fallback
      const cached = {
        full_name: cleanName,
        email: state.email,
        avatar_url: cleanAvatar,
      };
      localStorage.setItem("tm.profile", JSON.stringify(cached));

      const localUser = localStorage.getItem("tm.local_user");
      if (localUser) {
        try {
          const u = JSON.parse(localUser);
          u.user_metadata = {
            ...u.user_metadata,
            display_name: cleanName,
            full_name: cleanName,
            avatar_url: cleanAvatar,
          };
          localStorage.setItem("tm.local_user", JSON.stringify(u));
        } catch (_) {}
      }

      // 2. Persist to Supabase if configured
      if (isSupabaseConfigured && supabase) {
        const user = await getCurrentUser();
        if (user) {
          // A) Update auth metadata (persists with user login session)
          const { error: authErr } = await supabase.auth.updateUser({
            data: {
              display_name: cleanName,
              full_name: cleanName,
              avatar_url: cleanAvatar,
            },
          });
          if (authErr) console.warn("Supabase auth.updateUser warning:", authErr.message);

          // B) Upsert into profiles table
          try {
            const profilePayload = {
              id: user.id,
              email: user.email || state.email,
              full_name: cleanName,
              updated_at: new Date().toISOString(),
            };
            if (cleanAvatar) {
              profilePayload.avatar_url = cleanAvatar;
            }

            const { error: upsertErr } = await supabase.from("profiles").upsert(profilePayload);
            if (upsertErr && (upsertErr.code === "42703" || upsertErr.message?.includes("avatar_url"))) {
              delete profilePayload.avatar_url;
              await supabase.from("profiles").upsert(profilePayload);
            }
          } catch (dbErr) {
            if (!isMissingProfileTable(dbErr)) {
              console.warn("Supabase profiles table upsert warning:", dbErr.message);
            }
          }
        }
      }

      return {
        full_name: cleanName,
        avatar_url: cleanAvatar,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to save profile changes.");
    }
  }
);

const profileSlice = createSlice({
  name: "profile",
  initialState: {
    full_name: "",
    email: "",
    avatar_url: "",
    weekly_grocery_budget: (() => {
      try {
        const saved = localStorage.getItem("tm.weekly_grocery_budget");
        return saved ? Number(saved) : 120;
      } catch (_) {
        return 120;
      }
    })(),
    loading: false,
    saving: false,
    error: null,
    savedSuccess: false,
  },
  reducers: {
    setProfile(state, action) {
      if (action.payload.full_name !== undefined) state.full_name = action.payload.full_name;
      if (action.payload.email !== undefined) state.email = action.payload.email;
      if (action.payload.avatar_url !== undefined) state.avatar_url = action.payload.avatar_url;
    },
    setAvatarUrl(state, action) {
      state.avatar_url = action.payload;
    },
    setWeeklyGroceryBudget(state, action) {
      const val = Math.max(0, Number(action.payload) || 0);
      state.weekly_grocery_budget = val;
      try {
        localStorage.setItem("tm.weekly_grocery_budget", String(val));
      } catch (_) {}
    },
    clearProfileStatus(state) {
      state.savedSuccess = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.full_name = action.payload.full_name;
        state.email = action.payload.email;
        state.avatar_url = action.payload.avatar_url;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load profile.";
      })
      // Save Profile
      .addCase(saveUserProfile.pending, (state) => {
        state.saving = true;
        state.savedSuccess = false;
        state.error = null;
      })
      .addCase(saveUserProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.savedSuccess = true;
        state.full_name = action.payload.full_name;
        state.avatar_url = action.payload.avatar_url;
      })
      .addCase(saveUserProfile.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to save changes.";
      });
  },
});

export const { setProfile, setAvatarUrl, setWeeklyGroceryBudget, clearProfileStatus } = profileSlice.actions;
export default profileSlice.reducer;
