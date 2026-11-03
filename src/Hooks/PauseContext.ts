import { createContext, useContext } from "react";

// True while the host has paused the match. Every countdown reads this and
// stops ticking until play is pressed again.
export const PauseContext = createContext(false);
export const usePaused = () => useContext(PauseContext);
