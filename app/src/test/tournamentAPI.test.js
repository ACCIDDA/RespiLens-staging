import { http, HttpResponse } from "msw";
import { server } from "./msw/server";
import { getLeaderboard } from "../utils/tournamentAPI";

describe("tournamentAPI", () => {
  it("fetches leaderboard data through a mocked network response", async () => {
    server.use(
      http.get("https://example.com/tournament-api", ({ request }) => {
        const url = new URL(request.url);

        expect(url.searchParams.get("action")).toBe("getLeaderboard");
        expect(url.searchParams.get("tournamentId")).toBe("test-tournament");

        return HttpResponse.json({
          success: true,
          leaderboard: [{ participantName: "Emily", avgWIS: 1.23 }],
        });
      }),
    );

    const leaderboard = await getLeaderboard({
      id: "test-tournament",
      apiUrl: "https://example.com/tournament-api",
    });

    expect(leaderboard).toEqual([{ participantName: "Emily", avgWIS: 1.23 }]);
  });
});
