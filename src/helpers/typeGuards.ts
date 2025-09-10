/**
 * Type guards for safe type checking
 */

// Type guard for messages with text
export function hasText(message: unknown): message is { text: string } {
  return message !== null && typeof message === 'object' && 'text' in message && typeof (message as any).text === 'string';
}

// Type guard for messages with reply
export function hasReplyWithText(message: unknown): message is { reply_to_message: { text: string } } {
  return message !== null && typeof message === 'object' && 'reply_to_message' in message && 
         hasText((message as any).reply_to_message);
}

// Type guard for chats with username
export function hasUsername(chat: unknown): chat is { username: string } {
  return chat !== null && typeof chat === 'object' && 'username' in chat && typeof (chat as any).username === 'string';
}

// Type guard for chats with title
export function hasTitle(chat: unknown): chat is { title: string } {
  return chat !== null && typeof chat === 'object' && 'title' in chat && typeof (chat as any).title === 'string';
}

// Type guard for new chat members
export function hasNewChatMembers(message: unknown): message is { new_chat_members: unknown[] } {
  return message !== null && typeof message === 'object' && 'new_chat_members' in message && 
         Array.isArray((message as any).new_chat_members);
}

// Safe property access with default
export function safeProperty<T>(obj: unknown, property: string, defaultValue: T): T {
  if (obj && typeof obj === 'object' && property in obj) {
    const value = (obj as Record<string, unknown>)[property];
    return typeof value !== 'undefined' ? value as T : defaultValue;
  }
  return defaultValue;
}