/**
 * Tests for runner
 */

import { describe, it, expect } from "@jest/globals";
import type { RunPipelineOptions } from "./runner.js";

describe("runner", () => {
  it("should export runPipeline function", async () => {
    const { runPipeline } = await import("./runner.js");
    expect(typeof runPipeline).toBe("function");
  });

  // Note: Full integration tests would require a real API key
  // For now, we just verify the module exports correctly
});
