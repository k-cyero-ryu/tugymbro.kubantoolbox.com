import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Paperclip, Image, FileText, Link as LinkIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CommunityMessage {
  id: string;
  groupId: string;
  senderId: string;
  message: string;
  messageType: 'text' | 'file' | 'url';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
  urlPreviewTitle?: string;
  urlPreviewDescription?: string;
  urlPreviewImage?: string;
  createdAt: string;
  senderFirstName: string;
  senderLastName: string;
  senderRole: string;
}

interface CommunityGroup {
  id: string;
  trainerId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function Community() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get community group for current user
  const { data: group, isLoading: groupLoading } = useQuery<CommunityGroup>({
    queryKey: ['/api/community/group'],
  });

  // Get community messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<CommunityMessage[]>({
    queryKey: ['/api/community/messages', group?.id],
    queryFn: async () => {
      if (!group?.id) return [];
      const response = await fetch(`/api/community/${group.id}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!group?.id
  });

  // Create message mutation
  const createMessage = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch('/api/community/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/messages'] });
      refetchMessages(); // Force refetch messages
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('community.failedToSendMessage'),
        variant: "destructive",
      });
    },
  });

  // File upload mutation
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!group?.id) throw new Error("No community group found");
      
      setUploading(true);
      
      try {
        // Get upload URL
        const uploadUrlResponse = await fetch('/api/community/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: group.id }),
        });
        if (!uploadUrlResponse.ok) throw new Error('Failed to get upload URL');
        const { signedUrl, objectPath } = await uploadUrlResponse.json();

        // Upload file
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        return objectPath;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (objectPath: string, file: File) => {
      // Send message with file attachment
      createMessage.mutate({
        groupId: group?.id,
        message: `${t('community.sharedFile')}: ${file.name}`,
        messageType: 'file',
        attachmentUrl: objectPath,
        attachmentName: file.name,
        attachmentType: file.type,
        attachmentSize: file.size,
      });
    },
    onError: (error: any) => {
      toast({
        title: t('community.uploadFailed'),
        description: error.message || t('community.failedToUploadFile'),
        variant: "destructive",
      });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!group?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Community WebSocket connected');
      // Join the community group room
      ws.send(JSON.stringify({
        type: 'join_community_room',
        groupId: group.id,
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_community_message' && message.data.groupId === group.id) {
        console.log('New community message received:', message.data);
        queryClient.invalidateQueries({ queryKey: ['/api/community/messages', group.id] });
      }
    };

    ws.onclose = () => {
      console.log('Community WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave_community_room',
          groupId: group.id,
        }));
      }
      ws.close();
    };
  }, [group?.id, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSendMessage = () => {
    if (!message.trim() || !group?.id) return;
    
    // Check if message contains URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);
    
    createMessage.mutate({
      groupId: group.id,
      message: message.trim(),
      messageType: urls ? 'url' : 'text',
    });
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('community.fileTooLarge'),
        description: t('community.fileSizeLimit'),
        variant: "destructive",
      });
      return;
    }

    uploadFile.mutate(file);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Render message content
  const renderMessageContent = (msg: CommunityMessage) => {
    if (msg.messageType === 'file' && msg.attachmentUrl) {
      return (
        <div className="space-y-2">
          <p className="text-base font-medium">{msg.message}</p>
          <div className="bg-muted p-3 rounded-lg border">
            <div className="flex items-center space-x-2">
              {getFileIcon(msg.attachmentType || '')}
              <div className="flex-1">
                <p className="font-medium text-sm">{msg.attachmentName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(msg.attachmentSize || 0)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(msg.attachmentUrl, '_blank')}
                data-testid={`button-download-${msg.id}`}
              >
                {t('community.download')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (msg.messageType === 'url' && msg.urlPreviewTitle) {
      return (
        <div className="space-y-2">
          <p className="text-base font-medium">{msg.message}</p>
          <div className="bg-muted p-3 rounded-lg border">
            <div className="flex items-start space-x-3">
              <LinkIcon className="w-5 h-5 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{msg.urlPreviewTitle}</h4>
                {msg.urlPreviewDescription && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {msg.urlPreviewDescription}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return <p className="text-base font-medium">{msg.message}</p>;
  };

  if (groupLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">{t('community.noCommunityGroup')}</h3>
              <p className="text-muted-foreground">
                {t('community.communityGroupInfo')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" data-testid="text-community-title">{group.name}</h2>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
              )}
            </div>
            <Badge variant="secondary" data-testid="badge-member-count">
              {messages.length > 0 ? `${new Set(messages.map(m => m.senderId)).size} ${t('community.members')}` : t('community.community')}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 pb-4">
              {messagesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t('community.noMessagesYet')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('community.startConversation')}</p>
                </div>
              ) : (
                messages.slice().reverse().map((msg: CommunityMessage) => (
                  <div key={msg.id} className="flex space-x-3" data-testid={`message-${msg.id}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {msg.senderFirstName[0]}{msg.senderLastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-normal text-xs text-muted-foreground" data-testid={`text-sender-${msg.id}`}>
                          {msg.senderFirstName} {msg.senderLastName}
                        </span>
                        <Badge variant={msg.senderRole === 'trainer' ? 'default' : 'secondary'} className="text-xs">
                          {msg.senderRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('community.typeMessage')}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  data-testid="input-message"
                />
              </div>
              
              {/* File Upload */}
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                  data-testid="button-file-upload"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || createMessage.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {uploading && (
              <div className="mt-2 text-sm text-muted-foreground">
                {t('community.uploadingFile')}...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}