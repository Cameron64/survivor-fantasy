// Next.js requires the middleware to be exported as `middleware` from this file.
// The actual implementation lives in proxy.ts (Clerk wiring + route matchers).
export { proxy as middleware, config } from './proxy'
