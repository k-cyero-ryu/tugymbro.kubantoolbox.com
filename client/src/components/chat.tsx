import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
}

interface ChatUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
  role: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const userRole = user?.role || 'client';

  // Get list of users to chat with
  const { data: chatUsers = [] } = useQuery({
    queryKey: ['/api/chat/users'],
    enabled: !!user?.id,
  });

  // Find superadmins for direct contact
  const superAdmins = Array.isArray(chatUsers) ? chatUsers.filter((chatUser: ChatUser) => chatUser.role === 'superadmin') : [];

  // Get messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/chat/messages', selectedUser],
    enabled: !!selectedUser && !!user?.id,
  });

  // Expose function to open SuperAdmin chat
  useEffect(() => {
    const chatWidget = document.querySelector('[data-chat-widget]');
    if (chatWidget) {
      (chatWidget as any).openSuperAdminChat = () => {
        if (superAdmins.length > 0) {
          setSelectedUser(superAdmins[0].id);
          setIsOpen(true);
        }
      };
    }
  }, [superAdmins]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; message: string }) => {
      console.log('API request being made with data:', data);
      return apiRequest('POST', '/api/chat/messages', data);
    },
    onSuccess: (result) => {
      console.log('Message sent successfully:', result);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      setNewMessage("");
    },
    onError: (error) => {
      console.error('Error sending message:', error);
    },
  });

  // Setup WebSocket connection
  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);
      if (message.type === 'new_message') {
        queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, [user?.id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;

    console.log('Sending message:', { receiverId: selectedUser, message: newMessage.trim() });
    sendMessageMutation.mutate({
      receiverId: selectedUser,
      message: newMessage.trim(),
    });
  };

  const getUserDisplayName = (chatUser: ChatUser) => {
    if (chatUser.firstName || chatUser.lastName) {
      return `${chatUser.firstName || ''} ${chatUser.lastName || ''}`.trim();
    }
    return chatUser.email;
  };

  const getUserInitials = (chatUser: ChatUser) => {
    if (chatUser.firstName || chatUser.lastName) {
      return `${chatUser.firstName?.[0] || ''}${chatUser.lastName?.[0] || ''}`.toUpperCase();
    }
    return chatUser.email[0]?.toUpperCase() || 'U';
  };

  const filteredChatUsers = Array.isArray(chatUsers) ? chatUsers.filter((chatUser: ChatUser) => {
    if (userRole === 'trainer') {
      // Trainers can chat with clients AND superadmins
      return chatUser.role === 'client' || chatUser.role === 'superadmin';
    } else if (userRole === 'client') {
      return chatUser.role === 'trainer';
    } else if (userRole === 'superadmin') {
      // SuperAdmins can chat with everyone
      return chatUser.role === 'trainer' || chatUser.role === 'client';
    }
    return false;
  }) : [];

  return (
    <div 
      className="fixed bottom-6 right-6 z-50" 
      data-chat-widget
    >
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="w-16 h-16 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="w-96 h-96 shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          {!selectedUser ? (
            // Users List View
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="w-4 h-4" />
                    {userRole === 'trainer' ? 'Clients & Support' : 
                     userRole === 'superadmin' ? 'Users' : 'Trainers'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
                <div className="space-y-1 p-2">
                  {filteredChatUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No users available to chat
                    </div>
                  ) : (
                    filteredChatUsers.map((chatUser: ChatUser) => (
                      <Button
                        key={chatUser.id}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto text-left"
                        onClick={() => setSelectedUser(chatUser.id)}
                      >
                        <Avatar className="w-6 h-6 mr-2">
                          <AvatarImage src={chatUser.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">{getUserInitials(chatUser)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{getUserDisplayName(chatUser)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {chatUser.role}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            // Chat View
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                    className="text-left p-0 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={filteredChatUsers.find(u => u.id === selectedUser)?.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {filteredChatUsers.find(u => u.id === selectedUser) ? getUserInitials(filteredChatUsers.find(u => u.id === selectedUser)!) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {filteredChatUsers.find(u => u.id === selectedUser) ? getUserDisplayName(filteredChatUsers.find(u => u.id === selectedUser)!) : 'User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {filteredChatUsers.find(u => u.id === selectedUser)?.role}
                        </div>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 px-3 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
                <div className="space-y-3">
                  {Array.isArray(messages) && messages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    Array.isArray(messages) && messages.map((message: Message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg ${
                            message.senderId === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <div className="text-xs">{message.message}</div>
                          <div
                            className={`text-xs mt-1 opacity-70`}
                          >
                            {format(new Date(message.createdAt), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendMessageMutation.isPending}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    size="sm"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}