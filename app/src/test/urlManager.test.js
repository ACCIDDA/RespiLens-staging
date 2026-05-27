import { DATASETS } from "../config";
import { URLParameterManager } from "../utils/urlManager";

describe("URLParameterManager", () => {
  it("parses dataset-specific query params", () => {
    const params = new URLSearchParams(
      "view=flu_forecasts&flu_dates=2025-01-01,2025-01-08&flu_models=model-a,model-b&flu_target=wk%20inc%20flu%20hosp",
    );
    const manager = new URLParameterManager(params, vi.fn());

    expect(manager.getDatasetParams(DATASETS.flu)).toEqual({
      dates: ["2025-01-01", "2025-01-08"],
      models: ["model-a", "model-b"],
      target: "wk inc flu hosp",
    });
  });

  it("falls back to the default app view when the query contains an invalid view", () => {
    const manager = new URLParameterManager(
      new URLSearchParams("view=not-a-real-view"),
      vi.fn(),
    );

    expect(manager.getView()).toBe("frontpage");
  });

  it("writes only non-default advanced parameters back to the URL", () => {
    const setSearchParams = vi.fn();
    const manager = new URLParameterManager(
      new URLSearchParams("view=flu_forecasts"),
      setSearchParams,
    );

    manager.updateAdvancedParams({
      chartScale: "log",
      intervalVisibility: {
        median: true,
        ci50: false,
        ci95: false,
      },
      showLegend: false,
    });

    expect(setSearchParams).toHaveBeenCalledTimes(1);

    const [updatedParams, options] = setSearchParams.mock.calls[0];
    expect(updatedParams.toString()).toBe(
      "view=flu_forecasts&scale=log&intervals=median&legend=0",
    );
    expect(options).toEqual({ replace: true });
  });

  it("removes the location query param when the selected location matches the default", () => {
    const setSearchParams = vi.fn();
    const manager = new URLParameterManager(
      new URLSearchParams("view=frontpage&location=US"),
      setSearchParams,
    );

    manager.updateLocation("US");

    const [updatedParams] = setSearchParams.mock.calls[0];
    expect(updatedParams.toString()).toBe("view=frontpage");
  });
});
