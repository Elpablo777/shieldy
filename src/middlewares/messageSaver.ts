import { Context } from 'telegraf'
import { Worker } from 'worker_threads'
import { validateUserId, validateChatId, checkRateLimit } from '@helpers/validation'
import { report } from '@helpers/report'

export async function messageSaver(ctx: Context, next) {
  try {
    const message = ctx.update.edited_message || ctx.update.message
    if (!message || !message.message_id || !message.from?.id || !message.chat.id) {
      return next()
    }

    // Validate user and chat IDs
    if (!validateUserId(message.from.id) || !validateChatId(message.chat.id)) {
      console.warn('Invalid user or chat ID in message')
      return next()
    }

    // Rate limiting to prevent spam processing
    const rateLimitKey = `message_save_${message.from.id}`
    if (!checkRateLimit(rateLimitKey, 50, 60000)) { // 50 messages per minute per user
      return next()
    }

    // Type-safe property checks
    const hasEntities = 'entities' in message && Array.isArray(message.entities) && message.entities.length > 0
    const hasCaptionEntities = 'caption_entities' in message && Array.isArray(message.caption_entities) && message.caption_entities.length > 0
    const hasForwardFrom = 'forward_from' in message && message.forward_from
    const hasForwardDate = 'forward_date' in message && message.forward_date
    const hasForwardFromChat = 'forward_from_chat' in message && message.forward_from_chat
    const hasDocument = 'document' in message && message.document
    const hasSticker = 'sticker' in message && message.sticker
    const hasPhoto = 'photo' in message && message.photo
    const hasVideoNote = 'video_note' in message && message.video_note
    const hasVideo = 'video' in message && message.video
    const hasGame = 'game' in message && message.game

    if (
      hasEntities ||
      hasCaptionEntities ||
      hasForwardFrom ||
      hasForwardDate ||
      hasForwardFromChat ||
      hasDocument ||
      hasSticker ||
      hasPhoto ||
      hasVideoNote ||
      hasVideo ||
      hasGame
    ) {
      saveMessage(ctx)
    }
  } catch (error) {
    report(error, 'Error in messageSaver middleware')
  }
  return next()
}

const messageSaverWorker = new Worker(__dirname + '/messageSaverWorker.js')

// Handle worker errors
messageSaverWorker.on('error', (error) => {
  report(error, 'MessageSaver worker error')
})

messageSaverWorker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`MessageSaver worker stopped with exit code ${code}`)
  }
})

async function saveMessage(ctx: Context) {
  // Skip new chat members to prevent unnecessary processing
  const message = ctx.update.message
  if (message && 'new_chat_members' in message && message.new_chat_members) {
    return
  }
  
  const messageToSave = ctx.update.edited_message || ctx.update.message
  if (!messageToSave) {
    return
  }

  try {
    messageSaverWorker.postMessage(messageToSave)
  } catch (error) {
    report(error, 'Failed to post message to worker')
  }
}
