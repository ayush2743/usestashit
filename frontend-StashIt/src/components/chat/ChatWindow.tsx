import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messageAPI } from '../../lib/api';
import { Message, Conversation } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ChatWindow: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      const response = await messageAPI.getConversationMessages(conversationId!);
      setMessages(response.data.data.messages);
      setConversation(response.data.data.conversation);
      setLoading(false);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    try {
      await messageAPI.sendMessage(conversationId, { content: newMessage.trim() });
      setNewMessage('');
      loadMessages(); // Reload messages to get the new one
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleBack = () => {
    navigate('/messages');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Conversation not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 flex-1">
            
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">
                {conversation.otherUser?.firstName} {conversation.otherUser?.lastName}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {conversation.product.title} - ${conversation.product.price}
              </p>
            </div>

            {conversation.product.images?.[0] && (
              <div className="flex-shrink-0">
                <img 
                  src={conversation.product.images[0]} 
                  alt={conversation.product.title}
                  className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.senderId === user?.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow; 