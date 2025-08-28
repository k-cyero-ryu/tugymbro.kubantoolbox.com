import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Filter,
  Mail,
  Calendar,
  Target,
  Weight,
  Activity
} from "lucide-react";

export default function AdminClients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");

  // Fetch all clients with filters
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['/api/admin/clients', { search, status: statusFilter, trainer: trainerFilter }],
    queryFn: ({ queryKey }) => {
      const [url, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.status && params.status !== 'all') searchParams.append('status', params.status);
      if (params.trainer && params.trainer !== 'all') searchParams.append('trainer', params.trainer);
      
      const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;
      return fetch(fullUrl, { credentials: 'include' }).then(res => res.json());
    },
  });

  // Fetch trainers for filter
  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/admin/approved-trainers'],
  });

  const getUserInitials = (client: any) => {
    if (client?.userFirstName || client?.userLastName) {
      return `${client.userFirstName?.[0] || ''}${client.userLastName?.[0] || ''}`.toUpperCase();
    }
    return client?.userEmail?.[0]?.toUpperCase() || 'C';
  };

  const getUserDisplayName = (client: any) => {
    if (client?.userFirstName || client?.userLastName) {
      return `${client.userFirstName || ''} ${client.userLastName || ''}`.trim();
    }
    return client?.userEmail || 'Unknown Client';
  };

  const getTrainerDisplayName = (client: any) => {
    if (client?.trainerFirstName || client?.trainerLastName) {
      return `${client.trainerFirstName || ''} ${client.trainerLastName || ''}`.trim();
    }
    return client?.trainerEmail || 'No Trainer Assigned';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const ClientCard = ({ client }: { client: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={client.userProfileImageUrl} />
              <AvatarFallback>{getUserInitials(client)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{getUserDisplayName(client)}</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{client.userEmail}</span>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(client.userStatus)}>
            {client.userStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Trainer:</span>
              <span>{getTrainerDisplayName(client)}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Joined:</span>
              <span>{new Date(client.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Activity Level:</span>
              <span>{client.activityLevel || 'Not specified'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Current Weight:</span>
              <span>{client.currentWeight ? `${client.currentWeight} kg` : 'Not specified'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Target Weight:</span>
              <span>{client.targetWeight ? `${client.targetWeight} kg` : 'Not specified'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="font-medium">Height:</span>
              <span>{client.height ? `${client.height} cm` : 'Not specified'}</span>
            </div>
          </div>
        </div>
        {client.goals && (
          <div className="pt-2 border-t">
            <span className="font-medium text-sm">Goals:</span>
            <p className="text-sm text-muted-foreground mt-1">{client.goals}</p>
          </div>
        )}
        {client.medicalConditions && (
          <div className="pt-2 border-t">
            <span className="font-medium text-sm">Medical Conditions:</span>
            <p className="text-sm text-muted-foreground mt-1">{client.medicalConditions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Clients</h1>
          <p className="text-muted-foreground">
            View and filter all clients in the system
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trainer</label>
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All trainers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trainers</SelectItem>
                  {trainers.map((trainer: any) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.firstName || trainer.lastName 
                        ? `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim()
                        : trainer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(search || (statusFilter && statusFilter !== 'all') || (trainerFilter && trainerFilter !== 'all')) && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setTrainerFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No clients found</h3>
            <p className="text-muted-foreground">
              {search || (statusFilter && statusFilter !== 'all') || (trainerFilter && trainerFilter !== 'all')
                ? "Try adjusting your filters to see more results."
                : "There are no clients in the system yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients.map((client: any) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}