import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchUserProfile } from "./redux/profileSlice";
import MinddoSplashScreen from "./components/MinddoSplashScreen";

const SplashContext = createContext({
  isSplashVisible: false,
  isFadingOut: false,
  triggerSplashTransition: async () => { },
  showSplash: () => { },
  hideSplash: () => { },
});

export function SplashProvider({ children }) {
  const [splashState, setSplashState] = useState({
    isVisible: true, // Visible immediately on initial app startup
    isFadingOut: false,
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const transitionActiveRef = useRef(false);

  const triggerSplashTransition = useCallback(
    async (targetPath = "/dashboard", minDuration = 5000) => {
      transitionActiveRef.current = true;
      // 1. Immediately show splash screen
      setSplashState({ isVisible: true, isFadingOut: false });

      // 2. Concurrently preload profile data
      const profilePromise = dispatch(fetchUserProfile()).catch((err) => {
        console.debug("Profile preload non-fatal warning:", err);
      });

      // 3. Minimum display duration so the animated logo plays smoothly
      const timerPromise = new Promise((resolve) => setTimeout(resolve, minDuration));

      // 4. Navigate underneath while covered by splash screen
      if (targetPath) {
        navigate(targetPath, { replace: true });
      }

      await Promise.all([profilePromise, timerPromise]);

      // 5. Smooth fade out transition
      setSplashState((prev) => ({ ...prev, isFadingOut: true }));

      setTimeout(() => {
        setSplashState({ isVisible: false, isFadingOut: false });
        transitionActiveRef.current = false;
      }, 350);
    },
    [navigate, dispatch]
  );

  const showSplash = useCallback(() => {
    setSplashState({ isVisible: true, isFadingOut: false });
  }, []);

  const hideSplash = useCallback(() => {
    setSplashState((prev) => ({ ...prev, isFadingOut: true }));
    setTimeout(() => {
      setSplashState({ isVisible: false, isFadingOut: false });
    }, 350);
  }, []);

  return (
    <SplashContext.Provider
      value={{
        isSplashVisible: splashState.isVisible,
        isFadingOut: splashState.isFadingOut,
        triggerSplashTransition,
        showSplash,
        hideSplash,
        setSplashState,
      }}
    >
      {splashState.isVisible && (
        <MinddoSplashScreen isFadingOut={splashState.isFadingOut} />
      )}
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  return useContext(SplashContext);
}
