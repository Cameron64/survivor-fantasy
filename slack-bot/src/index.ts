import { App } from '@slack/bolt'
import http from 'http'
import { config } from './config'
import { registerMessageHandlers } from './handlers/message'
import { registerActionHandlers } from './handlers/actions'

const app = new App({
  token: config.slack.botToken,
  appToken: config.slack.appToken,
  signingSecret: config.slack.signingSecret,
  socketMode: true,
})

// Health check server for Railway
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'probst-bot' }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

async function start() {
  // Get bot user ID for mention stripping
  const authResult = await app.client.auth.test()
  const botUserId = authResult.user_id || ''

  registerMessageHandlers(app, botUserId)
  registerActionHandlers(app)

  // Start Bolt (Socket Mode)
  await app.start()
  console.log('[Probst Bot] Socket Mode connected')

  // Start health check server
  healthServer.listen(config.port, () => {
    console.log(`[Probst Bot] Health server on port ${config.port}`)
  })

  console.log('[Probst Bot] Come on in! Bot is ready.')
}

start().catch((err) => {
  console.error('[Probst Bot] Failed to start:', err)
  process.exit(1)
})
