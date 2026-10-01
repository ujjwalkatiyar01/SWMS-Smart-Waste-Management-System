// UI entry of dashboard analytics. Server-only reads are in ./server; pure helpers in ./compute.
export { AdminAnalytics } from "./sections/AdminAnalytics";
export { AuthorityAnalytics } from "./sections/AuthorityAnalytics";
export { SupervisorAnalytics } from "./sections/SupervisorAnalytics";
export { WorkerAnalytics } from "./sections/WorkerAnalytics";
export { parseRange } from "./compute";
