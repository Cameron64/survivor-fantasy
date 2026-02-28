import { expect, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Set up test environment variables before any imports that validate them
beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_1234567890'
  process.env.CLERK_SECRET_KEY = 'sk_test_1234567890'
  process.env.CLERK_WEBHOOK_SECRET = 'whsec_test_1234567890'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.NODE_ENV = 'test'
})

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})
