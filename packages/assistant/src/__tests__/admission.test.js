import { describe, it, expect } from "vitest";
import { createAdmission } from "../jobs/admission.js";

function respond(admission, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      },
    };
    admission(req, res, () => resolve({ next: true }));
  });
}

const switchRequest = (id) => ({ method: "PUT", path: `/api/projects/active/${id}` });

function busyJobs({ stop }) {
  let busy = true;
  return {
    isBusy: () => busy,
    isJobRequest: () => false,
    openJob: () => (busy ? { state: "active" } : null),
    publicJob: (job) => job,
    async stop(options) {
      busy = false;
      return stop(options);
    },
  };
}

describe("admission", () => {
  it("reports a switch that failed after the job was put back, rather than success", async () => {
    const jobs = busyJobs({
      stop: async () => {
        throw new Error("switch failed");
      },
    });
    const result = await respond(createAdmission({ jobs, siteExists: () => true }), switchRequest("site-2"));
    expect(result.status).toBe(500);
    expect(result.body.code).toBe("SWITCH_FAILED");
  });

  it("switches a decoded site id after stopping the job", async () => {
    const seen = [];
    const jobs = busyJobs({ stop: async (options) => void seen.push(options.switchTo) });
    const result = await respond(createAdmission({ jobs, siteExists: (id) => id === "site-2" }), switchRequest("site%2D2"));
    expect(result).toEqual({ status: 200, body: { success: true } });
    expect(seen).toEqual(["site-2"]);
  });

  it("refuses a switch to a site that doesn't exist instead of passing it on", async () => {
    const jobs = busyJobs({ stop: async () => {} });
    const result = await respond(createAdmission({ jobs, siteExists: () => false }), switchRequest("nope"));
    expect(result.status).toBe(423);
  });
});
