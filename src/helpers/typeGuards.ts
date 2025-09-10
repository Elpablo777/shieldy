/**
 * Type guards for safe type checking
 */

// Type guard for messages with text
export function hasText(message: any): message is { text: string } {
  return message && typeof message.text === 'string';
}

// Type guard for messages with reply
export function hasReplyWithText(message: any): message is { reply_to_message: { text: string } } {
  return message && message.reply_to_message && typeof message.reply_to_message.text === 'string';
}

// Type guard for chats with username
export function hasUsername(chat: any): chat is { username: string } {
  return chat && typeof chat.username === 'string';
}

// Type guard for chats with title
export function hasTitle(chat: any): chat is { title: string } {
  return chat && typeof chat.title === 'string';
}

// Type guard for new chat members
export function hasNewChatMembers(message: any): message is { new_chat_members: any[] } {
  return message && Array.isArray(message.new_chat_members);
}

// Safe property access with default
export function safeProperty<T>(obj: any, property: string, defaultValue: T): T {
  return obj && typeof obj[property] !== 'undefined' ? obj[property] : defaultValue;
}