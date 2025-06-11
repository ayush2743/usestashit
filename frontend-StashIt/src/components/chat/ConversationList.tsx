import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { messageAPI } from '../../lib/api';
import { Conversation } from '../../types';
import { formatDistanceToNow } from 'date-fns';

const ConversationList: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await messageAPI.getConversations();
      setConversations(response.data.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No conversations yet
        </div>
      ) : (
        conversations.map((conversation) => (
          <Link
            key={conversation.id}
            to={`/messages/${conversation.id}`}
            className="block p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="font-medium text-lg text-blue-600">
                  {conversation.otherUser?.firstName?.[0]?.toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.otherUser?.firstName} {conversation.otherUser?.lastName}
                  </h3>
                  {conversation.lastMessageAt && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage?.content || 'No messages yet'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {conversation.product.title} - ${conversation.product.price}
                    </p>
                  </div>
                  
                  {conversation.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
};

export default ConversationList; 