import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Filter, Eye, Edit, MessageCircle, Copy, ExternalLink, X } from "lucide-react";
import { Link } from "wouter";
import Chat from "@/components/chat";

export default function Clients() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: trainerData = { clients: [], referralCode: '', referralUrl: '' } } = useQuery({
    queryKey: ["/api/trainers/clients"],
    enabled: !!user && user.role === 'trainer',
  });

  const { clients = [], referralCode = '', referralUrl = '' } = trainerData;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('clients.copied'),
      description: t('clients.linkCopied'),
    });
  };

  const openChatWithClient = (clientUserId: string) => {
    setSelectedChatUserId(clientUserId);
    setShowChat(true);
  };

  const filteredClients = Array.isArray(clients) ? clients.filter((client: any) => {
    const matchesSearch = 
      client.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && client.user?.status === "active") ||
      (statusFilter === "inactive" && client.user?.status === "inactive");

    return matchesSearch && matchesStatus;
  }) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'trainer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('clients.accessDenied')}</h1>
          <p className="text-gray-600">{t('clients.trainersOnly')}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('clients.clientManagement')}</h1>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('clients.inviteClient')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('clients.shareReferralInfo')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">{t('clients.registrationUrl')}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={referralUrl}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(referralUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('clients.shareLink')}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">{t('clients.trainerCode')}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={referralCode}
                      readOnly
                      className="text-lg font-bold text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(referralCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('clients.manualCode')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(referralUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('clients.testLink')}
                </Button>
                <Button onClick={() => setShowInviteDialog(false)}>
                  {t('clients.done')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Client Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder={t('clients.searchClients')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('clients.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('clients.allStatus')}</SelectItem>
                <SelectItem value="active">{t('clients.active')}</SelectItem>
                <SelectItem value="inactive">{t('clients.inactive')}</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder={t('clients.allPlans')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('clients.allPlans')}</SelectItem>
                <SelectItem value="weight-loss">{t('clients.weightLoss')}</SelectItem>
                <SelectItem value="muscle-gain">{t('clients.muscleGain')}</SelectItem>
                <SelectItem value="strength">{t('clients.strengthTraining')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {t('clients.filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('clients.yourClients')} ({filteredClients?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients && filteredClients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.client')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.plan')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.progress')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client: any) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.user?.firstName} {client.user?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{client.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.bodyGoal || t('clients.noPlanAssigned')}</div>
                        <div className="text-sm text-gray-500">
                          {t('clients.started')} {new Date(client.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">75% {t('clients.complete')}</div>
                        <Progress value={75} className="w-full mt-1" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={client.user?.status === 'active' ? 'default' : 'secondary'}
                        >
                          {client.user?.status === 'active' ? t('clients.active') : t('clients.inactive')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Link href={`/clients/${client.id}`}>
                            <Button variant="ghost" size="sm" title={t('clients.viewDetails')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/clients/${client.id}/edit`}>
                            <Button variant="ghost" size="sm" title={t('clients.editClient')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title={t('clients.messageClient')}
                            onClick={() => openChatWithClient(client.userId)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('clients.noClientsFound')}</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? t('clients.adjustFilters')
                  : t('clients.buildClientBase')
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('clients.inviteFirstClient')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-4xl h-[600px] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t('clients.chatWithClient')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-[calc(600px-100px)]">
            {selectedChatUserId && <Chat targetUserId={selectedChatUserId} />}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
