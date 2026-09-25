import { useEffect, useState } from "react";

// Reveals the leaderboard one row every 150ms (models plus the user) and
// starts over whenever `scores` changes; pass null to hide it.
export const useRankingReveal = (scores) => {
  const [visibleRankings, setVisibleRankings] = useState(0);
  const total = scores ? scores.models.length + 1 : 0;

  useEffect(() => {
    setVisibleRankings(0);
    if (!total) return undefined;
    const interval = setInterval(() => {
      setVisibleRankings((prev) => {
        if (prev >= total) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [scores, total]);

  return visibleRankings;
};
