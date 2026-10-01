export type DemoRole = "worker" | "collector" | "driver";
export type DemoFlow = DemoRole | "report" | "disposal";

export const demoRoles: { id: DemoRole; label: string }[] = [
  { id: "worker", label: "Worker" },
  { id: "collector", label: "Waste collector" },
  { id: "driver", label: "Driver" },
];

export function isDemoRole(value: string | undefined): value is DemoRole {
  return demoRoles.some((role) => role.id === value);
}

export const demoFlows: Record<DemoFlow, { title: string; steps: string[]; result: string }> = {
  worker: {
    title: "Worker duty demo",
    steps: ["Log in with work email, password, staff ID and today's work area.", "See assigned duties and cases on the worker dashboard.", "Start a duty, then mark it done with an after-photo; the admin sees its updated status."],
    result: "The real duty action checks the signed-in worker and saves evidence. This demo saves nothing.",
  },
  collector: {
    title: "Waste collector demo",
    steps: ["Log in as a worker registered as a waste collector and choose today's work area.", "Open assigned collection duties or scheduled pickups.", "Record completion evidence and whether the waste was segregated; the organisation's policy determines the next step."],
    result: "The real pickup or duty action checks the assignment and updates its record. This demo saves nothing.",
  },
  driver: {
    title: "Driver trip demo",
    steps: ["Log in as a worker registered as a driver and choose From and To areas.", "Scan the vehicle QR; the real trip start checks the driver, vehicle and organisation.", "While the trip page stays open, the phone sends GPS positions. End trip stops the live view."],
    result: "The real vehicle scan starts a trip only for an authorised driver. This demo does not start or track one.",
  },
  report: {
    title: "Bin or spot report demo",
    steps: ["A resident opens the report form and scans the printed bin or spot QR.", "The code is checked against active places in the resident's own organisation.", "A match preselects that place; the resident still adds a photo, category and details before submitting."],
    result: "A scan alone never submits a report. This demo does not create one.",
  },
  disposal: {
    title: "Disposal-site verification demo",
    steps: ["At the disposal site, the driver scans its QR or types the printed code.", "The documented check compares the site, driver's trip and phone GPS with the site's geofence.", "Verified, outside-geofence or no-scan results would be recorded, and non-verified results flagged for admins."],
    result: "This disposal-site action is documented but is not yet implemented in the app. This demo records no verification.",
  },
};
