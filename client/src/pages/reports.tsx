import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Calendar, Download, BarChart3 } from "lucide-react";

export default function Reports() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: stats } = useQuery({
    queryKey: ["/api/trainers", user?.trainer?.id, "stats"],
    enabled: !!user?.trainer?.id,
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/trainers", user?.trainer?.id, "clients"],
    enabled: !!user?.trainer?.id,
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only trainers can access this page.</p>
        </div>
      </div>
    );
  }

  // Mock data for demonstration - in a real app this would come from the API
  const performanceData = clients?.map((client: any, index: number) => ({
    id: client.id,
    name: `${client.user?.firstName} ${client.user?.lastName}`,
    progress: 65 + (index * 5), // Mock progress
    lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    trend: Math.random() > 0.5 ? 'up' : 'down',
  }));

  const monthlyStats = [
    { month: 'Jan', clients: 15, revenue: 1800 },
    { month: 'Feb', clients: 18, revenue: 2200 },
    { month: 'Mar', clients: 22, revenue: 2800 },
    { month: 'Apr', clients: 24, revenue: 3200 },
    { month: 'May', clients: 25, revenue: 3400 },
    { month: 'Jun', clients: stats?.totalClients || 26, revenue: stats?.monthlyRevenue || 3600 },
  ];

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex space-x-4">
          <Select defaultValue="last-30-days">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-3-months">Last 3 months</SelectItem>
              <SelectItem value="last-year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Client Growth</p>
                <p className="text-2xl font-bold text-gray-900">+12%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Growth</p>
                <p className="text-2xl font-bold text-gray-900">+8%</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Progress</p>
                <p className="text-2xl font-bold text-gray-900">78%</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                <p className="text-2xl font-bold text-gray-900">94%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">last 6 months</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Business Growth</CardTitle>
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
              <span>Clients</span>
              <span>Revenue: ${monthlyStats[monthlyStats.length - 1].revenue}</span>
            </div>
          </CardContent>
        </Card>

        {/* Client Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Client Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Excellent (80-100%)</span>
                <span className="font-medium text-green-600">
                  {performanceData?.filter(c => c.progress >= 80).length || 0} clients
                </span>
              </div>
              <Progress value={40} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span>Good (60-79%)</span>
                <span className="font-medium text-yellow-600">
                  {performanceData?.filter(c => c.progress >= 60 && c.progress < 80).length || 0} clients
                </span>
              </div>
              <Progress value={35} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span>Needs Improvement (0-59%)</span>
                <span className="font-medium text-red-600">
                  {performanceData?.filter(c => c.progress < 60).length || 0} clients
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
            <CardTitle className="text-green-600">Top Performing Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData?.slice(0, 5).sort((a, b) => b.progress - a.progress).map((client, index) => (
                <div key={client.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">Last active: {client.lastActivity}</p>
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
            <CardTitle className="text-orange-600">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData?.slice(0, 5).sort((a, b) => a.progress - b.progress).map((client, index) => (
                <div key={client.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-medium text-orange-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">Last active: {client.lastActivity}</p>
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
