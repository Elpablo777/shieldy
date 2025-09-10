import { isGroup } from '@helpers/isGroup'
import { deleteMessageSafe } from '@helpers/deleteMessageSafe'
import { hasText, hasUsername } from '@helpers/typeGuards'
import { validateUserId, sanitizeInput } from '@helpers/validation'
import { report } from '@helpers/report'
import { Context } from 'telegraf'
import tall from 'tall'

const disallowedUrlParts = ['http://t.me/', 'https://t.me/']

export async function checkNoChannelLinks(ctx: Context, next: Function) {
  try {
    const message = ctx.update.message
    if (message?.date && hasText(message) && message.text === '/help') {
      console.log(
        'Got to checkNoChannelLinks on help',
        Date.now() / 1000 - message.date
      )
    }

    // Get the message
    const messageToCheck = ctx.editedMessage || ctx.message
    // If there is no message, just continue
    if (!messageToCheck) {
      return next()
    }

    // Validate user ID for security
    if (messageToCheck.from?.id && !validateUserId(messageToCheck.from.id)) {
      console.warn('Invalid user ID in checkNoChannelLinks')
      return next()
    }

    // If there is no need to check for links, just continue
    if (!ctx.dbchat?.noChannelLinks) {
      return next()
    }
    // If sent from private chat or channel, just continue
    if (!isGroup(ctx)) {
      return next()
    }
    // If there are no url entities, just continue
    const allEntities = (messageToCheck.entities || []).concat(
      messageToCheck.caption_entities || []
    )
    if (
      !allEntities.length ||
      !allEntities.reduce(
        (p, c) => c.type === 'url' || c.type === 'text_link' || p,
        false
      )
    ) {
      return next()
    }
    
    // If sent from admins, just ignore  
    const adminIds = [777000, parseInt(process.env.ADMIN || '0')]
    if (adminIds.includes(ctx.from?.id || 0) || ctx.isAdministrator) {
      return next()
    }
    
    // Create a placeholder if the message needs deletion
    let needsToBeDeleted = false
    
    // Check all entities
    for (const entity of allEntities) {
      // Skip unnecessary entities
      if (entity.type !== 'url' && entity.type !== 'text_link') {
        continue
      }
      // Get url
      let url: string
      if (entity.type === 'text_link' && entity.url) {
        url = sanitizeInput(entity.url)
      } else {
        const messageText = messageToCheck.text || messageToCheck.caption || ''
        url = sanitizeInput(messageText.substring(
          entity.offset,
          entity.offset + entity.length
        ))
      }
      
      // If the link is a telegram link, mark the message for deletion
      const chatUsername = hasUsername(ctx.chat) ? ctx.chat.username : ''
      if (checkIfUrlIncludesDisallowedParts(url, chatUsername)) {
        needsToBeDeleted = true
        break
      }
      
      // Try to unshorten the link
      try {
        // Add http just in case
        url =
          url.includes('https://') || url.includes('http://')
            ? url
            : 'http://' + url
        
        // Unshorten the url with timeout protection
        const unshortenedUrl = await Promise.race([
          tall(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('URL shortening timeout')), 5000)
          )
        ]) as string
        
        // If the link is a telegram link, mark the message for deletion
        if (
          checkIfUrlIncludesDisallowedParts(unshortenedUrl, chatUsername)
        ) {
          needsToBeDeleted = true
          break
        }
      } catch (err) {
        // Log the error but continue processing
        console.warn('URL processing error:', err.message)
      }
    }
    
    // Delete the message if needed
    if (needsToBeDeleted) {
      await deleteMessageSafe(ctx)
    }
    
  } catch (error) {
    report(error, 'Error in checkNoChannelLinks middleware')
  }
  
  return next()
}

function checkIfUrlIncludesDisallowedParts(url: string, chatUsername: string) {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  for (const part of disallowedUrlParts) {
    if (url.includes(part) && !url.includes(`://t.me/${chatUsername}`)) {
      return true
    }
  }
  return false
}
