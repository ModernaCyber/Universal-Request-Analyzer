// MSW server setup for Node.js test environment
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Setup MSW mock server with request handlers
 * This server intercepts HTTP requests in Node.js tests
 */
export const server = setupServer(...handlers);
