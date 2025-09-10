import 'module-alias/register'
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })

// Validate environment variables early
import { validateEnvironment } from '@helpers/validation'
try {
  validateEnvironment()
} catch (error) {
  console.error('Environment validation failed:', error.message)
  process.exit(1)
}

import { Context } from 'telegraf'
import { report } from '@helpers/report'
import { bot } from '@helpers/bot'
import { isMaster, fork } from 'cluster'
import { cpus } from 'os'
import { startServer } from './server'

// Generate cluster workers
const workers: any[] = []
if (isMaster) {
  console.info(`Master ${process.pid} is running`)
  
  // Limit workers to prevent resource exhaustion
  const numWorkers = Math.min(cpus().length, 4)
  for (let i = 0; i < numWorkers; i += 1) {
    const worker = fork()
    workers.push(worker)
    
    // Handle worker errors
    worker.on('error', (error) => {
      report(error, `Worker ${worker.process.pid} error`)
    })
    
    worker.on('exit', (code, signal) => {
      if (code !== 0 && !worker.isDead()) {
        console.error(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`)
        // Remove dead worker from array
        const index = workers.indexOf(worker)
        if (index > -1) {
          workers.splice(index, 1)
        }
      }
    })
  }
  
  if (process.env.PREMIUM === 'true') {
    try {
      startServer()
    } catch (error) {
      report(error, 'Failed to start premium server')
    }
  }
} else {
  const handler = require('./updateHandler')
  console.info(`Worker ${process.pid} started`)
  process.on('message', (update) => {
    try {
      handler.handleUpdate(update)
    } catch (error) {
      report(error, `Worker ${process.pid} update handling error`)
    }
  })
}

// Start bot
if (isMaster) {
  bot.use((ctx) => {
    try {
      handleCtx(ctx)
    } catch (error) {
      report(error, 'Context handling error')
    }
  })
  
  // Add global error handlers
  process.on('uncaughtException', (error) => {
    report(error, 'Uncaught exception')
  })
  
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    report(error, 'Unhandled rejection')
  })
  
  bot
    .launch({
      polling: {
        allowedUpdates: [
          'callback_query',
          'chosen_inline_result',
          'edited_message',
          'inline_query',
          'message',
          'poll',
          'poll_answer',
          'chat_member',
        ] as any,
      },
    })
    .then(() => {
      console.info('Bot on the main thread is up and running')
    })
    .catch((error) => {
      report(error, 'Bot launch failed')
      process.exit(1)
    })
}

// Handle update
let clusterNumber = 0
function handleCtx(ctx: Context) {
  // Filter out valid workers only
  const activeWorkers = workers.filter(worker => !worker.isDead())
  
  if (activeWorkers.length === 0) {
    console.error('No active workers available')
    return
  }
  
  if (clusterNumber >= activeWorkers.length) {
    clusterNumber = 0
  }
  
  const worker = activeWorkers[clusterNumber]
  if (worker && !worker.isDead()) {
    clusterNumber += 1
    try {
      worker.send(ctx.update)
    } catch (error) {
      report(error, `Failed to send update to worker ${worker.process.pid}`)
    }
  }
}
