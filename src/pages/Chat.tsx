
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

const quickMessages = [
  "Want to split an UberXL?",
  "I'm at Terminal B — meet at rideshare zone?",
  "When does your flight land?"
];

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherParticipant, setOtherParticipant] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !chatId) {
      navigate('/');
      return;
    }

    // Load chat data from localStorage
    const chatData = localStorage.getItem(`knot_chat_${chatId}`);
    if (chatData) {
      const parsed = JSON.parse(chatData);
      setMessages(parsed.messages || []);
      const otherPerson = parsed.participants.find((p: string) => p !== user.name);
      setOtherParticipant(otherPerson || 'Unknown');
    }

    // Add initial system message
    if (messages.length === 0) {
      const systemMessage: Message = {
        id: `msg_${Date.now()}`,
        text: "You're now connected! Coordinate your rideshare below.",
        sender: 'system',
        timestamp: Date.now()
      };
      setMessages([systemMessage]);
    }
  }, [user, chatId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !user) return;

    const message: Message = {
      id: `msg_${Date.now()}`,
      text: text.trim(),
      sender: user.name,
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);

    // Save to localStorage
    if (chatId) {
      const chatData = localStorage.getItem(`knot_chat_${chatId}`);
      if (chatData) {
        const parsed = JSON.parse(chatData);
        parsed.messages = updatedMessages;
        localStorage.setItem(`knot_chat_${chatId}`, JSON.stringify(parsed));
      }
    }

    setNewMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(newMessage);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/matching')}
            className="mr-3 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{otherParticipant}</h1>
            <p className="text-sm text-gray-600">Travel buddy</p>
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
        <p className="text-sm text-blue-800 text-center font-medium">
          🔒 Only pay via Uber/Lyft. Never pay cash.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.sender === 'system' ? (
              <div className="text-center">
                <div className="inline-block bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-600">
                  {message.text}
                </div>
              </div>
            ) : (
              <div className={`flex ${message.sender === user.name ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === user.name
                      ? 'bg-knot-blue text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === user.name ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Messages */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickMessages.map((msg, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(msg)}
              className="whitespace-nowrap text-xs border-gray-200 text-gray-600 hover:bg-gray-50 flex-shrink-0"
            >
              {msg}
            </Button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-100 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border-gray-200"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-knot-blue hover:bg-blue-600 text-white p-3 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
