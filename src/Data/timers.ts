// Central place for all round-loop timing numbers. Keeping these as named
// constants (rather than magic numbers scattered across components) is what
// makes it easy for a future modifier to override them (e.g. a "Hold on,
// Wait for me!" affix that adds 10s, or a cooldown-extending effect).

export const TIMER_CONFIG = {
  banSeconds: 30, // per ban, host-controlled clock
  draftSeconds: 30, // per pick, host-controlled clock
  squadSeconds: 30, // per player, to select their 3-agent squad
  scoreTotalSeconds: 8 * 60, // total time to submit a score
  scoreSuddenDeathSeconds: 2 * 60, // cap applied to the OTHER player once one player locks in
};

// How many rounds a used agent stays on cooldown (unselectable in Squad
// Select) before becoming available again. A future modifier that changes
// cooldown length would change this value (or apply a per-agent override).
export const COOLDOWN_ROUNDS = 1;
