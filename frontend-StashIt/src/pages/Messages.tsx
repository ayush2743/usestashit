import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';

const Messages: React.FC = () => {
  const location = useLocation();
  const isConversationOpen = location.pathname !== '/messages';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex h-[calc(100vh-12rem)]">
          {/* Conversations Sidebar */}
          <div className={`${isConversationOpen ? 'hidden lg:block' : ''} w-full lg:w-96 border-r border-gray-200`}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ConversationList />
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${isConversationOpen ? 'block' : 'hidden lg:block'} flex-1 bg-gray-50`}>
            <Routes>
              <Route index element={
                <div className="h-full flex items-center justify-center text-gray-500">
                  Select a conversation to start messaging
                </div>
              } />
              <Route path=":conversationId" element={<ChatWindow />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages; 