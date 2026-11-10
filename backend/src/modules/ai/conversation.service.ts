import {
  ConversationRepository,
  IConversation,
} from './conversation.model.js'
import {
  MessageRepository,
  IMessage,
  MessageRole,
  MessageStatus,
} from './message.model.js'

export class ConversationService {
  /**
   * Create a new conversation for a verified owner
   */
  async createConversation(ownerId: string, initialTitle?: string): Promise<IConversation> {
    const title = initialTitle?.trim() || 'New Academic Consultation'
    return ConversationRepository.create(ownerId, title)
  }

  /**
   * List conversations belonging exclusively to the owner
   */
  async listUserConversations(ownerId: string): Promise<IConversation[]> {
    return ConversationRepository.findByOwner(ownerId)
  }

  /**
   * Get a conversation by ID, enforcing strict ownership
   */
  async getConversation(id: string, ownerId: string): Promise<IConversation> {
    const conv = await ConversationRepository.findById(id)
    if (!conv) {
      throw new Error('Conversation not found')
    }
    if (conv.ownerId !== ownerId) {
      throw new Error('Forbidden: You do not have permission to access this conversation')
    }
    return conv
  }

  /**
   * Rename a conversation with ownership enforcement
   */
  async renameConversation(id: string, ownerId: string, newTitle: string): Promise<IConversation> {
    await this.getConversation(id, ownerId) // checks existence & ownership
    const updated = await ConversationRepository.update(id, { title: newTitle.trim() })
    if (!updated) {
      throw new Error('Failed to update conversation')
    }
    return updated
  }

  /**
   * Delete a conversation and its messages with ownership enforcement
   */
  async deleteConversation(id: string, ownerId: string): Promise<boolean> {
    await this.getConversation(id, ownerId)
    await MessageRepository.deleteByConversation(id)
    return ConversationRepository.delete(id)
  }

  /**
   * Retrieve messages chronologically for a conversation
   */
  async getConversationMessages(conversationId: string, ownerId: string): Promise<IMessage[]> {
    await this.getConversation(conversationId, ownerId)
    return MessageRepository.findByConversation(conversationId)
  }

  /**
   * Persist a message to the conversation and update conversation lastMessageAt
   */
  async addMessage(
    conversationId: string,
    ownerId: string,
    role: MessageRole,
    content: string,
    status: MessageStatus = 'completed',
    providerMetadata?: IMessage['providerMetadata']
  ): Promise<IMessage> {
    const conv = await this.getConversation(conversationId, ownerId)

    const msg = await MessageRepository.create({
      conversationId,
      role,
      content,
      status,
      providerMetadata,
    })

    // If conversation still has default title and this is the first user message, generate title
    if (
      role === 'user' &&
      (conv.title === 'New Academic Consultation' || conv.title === 'New Conversation')
    ) {
      const generatedTitle = this.generateTitleFromPrompt(content)
      await ConversationRepository.update(conversationId, {
        title: generatedTitle,
        lastMessageAt: new Date(),
      })
    } else {
      await ConversationRepository.update(conversationId, {
        lastMessageAt: new Date(),
      })
    }

    return msg
  }

  /**
   * Generates a clean academic title from student prompt
   */
  private generateTitleFromPrompt(prompt: string): string {
    const clean = prompt
      .replace(/[^\w\s-]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join(' ')

    if (!clean) return 'Academic Consultation'
    return clean.charAt(0).toUpperCase() + clean.slice(1)
  }
}

export const conversationService = new ConversationService()
