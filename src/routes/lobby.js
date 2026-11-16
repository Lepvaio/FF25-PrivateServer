export function getLobby(user) {
  return {
    server: "FF25 Experimental API",
    status: "online",
    player: user,
    notice: "This is a standalone test lobby, not the official Free Fire lobby.",
    features: ["account", "profile", "lobby-status"],
    matchmaking: "not-implemented"
  };
}
