import { getDataPath } from "../utils/paths";

describe("getDataPath", () => {
  it("builds processed data URLs from relative asset paths", () => {
    expect(getDataPath("forecasts/latest.json")).toBe(
      "/processed_data/forecasts/latest.json",
    );
  });
});
