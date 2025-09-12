import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Calendar, Download, BarChart3 } from "lucide-react";

export default function Reports() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('auth.unauthorized'),
        description: t('auth.loggedOutRetry'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats = {} as { totalClients?: number; monthlyRevenue?: number } } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: user?.role === 'trainer',
  });

  const { data: clients = [] as any[] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: user?.role === 'trainer',
  });

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('reports.accessDenied')}</h1>
          <p className="text-gray-600">{t('reports.trainersOnly')}</p>
        </div>
      </div>
    );
  }

  // Mock data for demonstration - in a real app this would come from the API
  const performanceData = clients.map((client: any, index: number) => ({
    id: client.id,
    name: `${client.user?.firstName} ${client.user?.lastName}`,
    progress: 65 + (index * 5), // Mock progress
    lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    trend: Math.random() > 0.5 ? 'up' : 'down',
  }));

  const getLocalizedMonth = (monthIndex: number) => {
    const date = new Date(2024, monthIndex, 1);
    return new Intl.DateTimeFormat(i18n.language || 'en-US', { month: 'short' }).format(date);
  };

  const monthlyStats = [
    { month: getLocalizedMonth(0), clients: 15, revenue: 1800 }, // Jan
    { month: getLocalizedMonth(1), clients: 18, revenue: 2200 }, // Feb
    { month: getLocalizedMonth(2), clients: 22, revenue: 2800 }, // Mar
    { month: getLocalizedMonth(3), clients: 24, revenue: 3200 }, // Apr
    { month: getLocalizedMonth(4), clients: 25, revenue: 3400 }, // May
    { month: getLocalizedMonth(5), clients: stats.totalClients || 26, revenue: stats.monthlyRevenue || 3600 }, // Jun
  ];

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="title-reports">{t('reports.analytics')}</h1>
        <div className="flex space-x-4">
          <Select defaultValue="last-30-days">
            <SelectTrigger className="w-40" data-testid="select-time-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">{t('reports.last7Days')}</SelectItem>
              <SelectItem value="last-30-days">{t('reports.last30Days')}</SelectItem>
              <SelectItem value="last-3-months">{t('reports.last3Months')}</SelectItem>
              <SelectItem value="last-year">{t('reports.lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
{t('reports.export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600" data-testid="text-client-growth">{t('reports.clientGrowth')}</p>
                <p className="text-2xl font-bold text-gray-900">+12%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('reports.vsLastMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600" data-testid="text-revenue-growth">{t('reports.revenueGrowth')}</p>
                <p className="text-2xl font-bold text-gray-900">+8%</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('reports.vsLastMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600" data-testid="text-avg-progress">{t('reports.avgProgress')}</p>
                <p className="text-2xl font-bold text-gray-900">78%</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('reports.acrossAllClients')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600" data-testid="text-retention-rate">{t('reports.retentionRate')}</p>
                <p className="text-2xl font-bold text-gray-900">94%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('reports.last6Months')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle data-testid="title-business-growth">{t('reports.businessGrowth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-r from-primary/10 to-green-100 rounded-lg flex items-end justify-center space-x-4 p-4">
              {monthlyStats.map((stat, index) => (
                <div key={stat.month} className="flex flex-col items-center">
                  <div 
                    className="bg-primary w-8 rounded-t transition-all duration-500"
                    style={{ height: `${(stat.clients / 30) * 200}px` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">{stat.month}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-4">
              <span>{t('reports.clientsLabel')}</span>
              <span>{t('reports.revenue')} ${monthlyStats[monthlyStats.length - 1].revenue}</span>
            </div>
          </CardContent>
        </Card>

        {/* Client Performance */}
        <Card>
          <CardHeader>
            <CardTitle data-testid="title-client-performance">{t('reports.clientPerformanceOverview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{t('reports.excellent')}</span>
                <span className="font-medium text-green-600">
                  {performanceData.filter((c: any) => c.progress >= 80).length || 0} {t('reports.clients')}
                </span>
              </div>
              <Progress value={40} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span>{t('reports.good')}</span>
                <span className="font-medium text-yellow-600">
                  {performanceData.filter((c: any) => c.progress >= 60 && c.progress < 80).length || 0} {t('reports.clients')}
                </span>
              </div>
              <Progress value={35} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span>{t('reports.needsImprovement')}</span>
                <span className="font-medium text-red-600">
                  {performanceData.filter((c: any) => c.progress < 60).length || 0} {t('reports.clients')}
                </span>
              </div>
              <Progress value={25} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best/Worst Performing Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600" data-testid="title-top-performing">{t('reports.topPerforming')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.slice(0, 5).sort((a: any, b: any) => b.progress - a.progress).map((client: any, index: number) => (
                <div key={client.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">{t('reports.lastActive')} {client.lastActivity}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-green-600">
                      {client.progress}%
                    </Badge>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600" data-testid="title-needs-attention">{t('reports.needsAttention')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.slice(0, 5).sort((a: any, b: any) => a.progress - b.progress).map((client: any, index: number) => (
                <div key={client.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-medium text-orange-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">{t('reports.lastActive')} {client.lastActivity}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-orange-600">
                      {client.progress}%
                    </Badge>
                    {client.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
