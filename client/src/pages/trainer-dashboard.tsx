import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Chat from "@/components/chat";
import { Users, UserCheck, DollarSign, Dumbbell, Plus, PenTool, BarChart, Copy, MessageCircle, X } from "lucide-react";

export default function TrainerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { t } = useTranslation();

  // Redirect to login if not authenticated
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

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/trainers/stats"],
    enabled: !!user && user.role === 'trainer',
  });

  const { data: clientsData = {} } = useQuery({
    queryKey: ["/api/trainers/clients"],
    enabled: !!user && user.role === 'trainer',
  });

  const clients = clientsData.clients || [];
  const referralCode = clientsData.referralCode;

  const { data: trainer } = useQuery({
    queryKey: ["/api/trainers/profile"],
    enabled: !!user && user.role === 'trainer',
  });

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({
        title: t('dashboard.copied'),
        description: t('dashboard.copiedDescription'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
        <p className="text-gray-600 mt-2">{t('dashboard.welcome')}</p>
      </div>

      {/* Payment Plan Status */}
      {trainer?.paymentPlan && (
        <div className="mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-900">{t('dashboard.yourPaymentPlan')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-blue-800">{trainer.paymentPlan.name}</p>
                  <p className="text-sm text-blue-600">
                    ${trainer.paymentPlan.amount}/{trainer.paymentPlan.type}
                  </p>
                </div>
                <Badge variant="default" className="bg-blue-600">
                  {trainer.paymentPlan.isActive ? t('dashboard.active') : t('dashboard.inactive')}
                </Badge>
              </div>
              {trainer.paymentPlan.features && trainer.paymentPlan.features.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">{t('dashboard.features')}:</p>
                  <ul className="text-xs text-blue-600 list-disc list-inside">
                    {trainer.paymentPlan.features.map((feature: string, index: number) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('dashboard.totalClients')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalClients || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('dashboard.activeClients')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeClients || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('dashboard.monthlyRevenue')}</p>
                <p className="text-2xl font-bold text-gray-900">${stats?.monthlyRevenue || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/10">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('dashboard.trainingPlans')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalPlans || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              {clients && clients.length > 0 ? (
                <div className="space-y-4">
                  {clients.slice(0, 5).map((client: any) => (
                    <div key={client.id} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{client.user?.firstName} {client.user?.lastName}</p>
                        <p className="text-sm text-gray-500">{t('dashboard.newClientRegistered')}</p>
                      </div>
                      <Badge variant="secondary">{t('dashboard.new')}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{t('clients.noClients')}</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                  <Plus className="h-6 w-6 mb-2" />
                  <span className="text-sm">{t('dashboard.createPlan')}</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                  <Dumbbell className="h-6 w-6 mb-2" />
                  <span className="text-sm">{t('dashboard.addExercise')}</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                  <PenTool className="h-6 w-6 mb-2" />
                  <span className="text-sm">{t('dashboard.createPost')}</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                  <BarChart className="h-6 w-6 mb-2" />
                  <span className="text-sm">{t('dashboard.viewReports')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Client Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.clientProgress')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 bg-gradient-to-r from-primary/10 to-green-100 rounded-lg flex items-end justify-center space-x-2 p-4">
                <div className="bg-primary w-6 h-16 rounded-t"></div>
                <div className="bg-primary w-6 h-20 rounded-t"></div>
                <div className="bg-primary w-6 h-24 rounded-t"></div>
                <div className="bg-primary w-6 h-28 rounded-t"></div>
                <div className="bg-green-500 w-6 h-32 rounded-t"></div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                {t('dashboard.averageImprovement')} <span className="font-semibold text-green-600">+15%</span> {t('dashboard.thisMonth')}
              </p>
            </CardContent>
          </Card>

          {/* Referral Code */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.yourReferralCode')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">{t('dashboard.shareThisCode')}</p>
                <p className="text-2xl font-bold text-primary">{referralCode || 'Loading...'}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3"
                  onClick={copyReferralCode}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {t('dashboard.copyCode')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact SuperAdmin */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.needHelp')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {t('dashboard.helpDescription')}
                </p>
                <Button 
                  className="w-full"
                  onClick={() => setIsChatOpen(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t('dashboard.contactSuperAdmin')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.upcomingEvaluations')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.isArray(clients) && clients.length > 0 ? (
                  clients.slice(0, 3).map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {client.user?.firstName} {client.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{t('dashboard.dueSoon')}</p>
                      </div>
                      <Badge variant="outline">{t('dashboard.pending')}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">{t('dashboard.noUpcomingEvaluations')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Chat Button */}
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        onClick={() => setIsChatOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-4xl h-[600px] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Communication Center
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-[calc(600px-100px)]">
            <Chat />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
