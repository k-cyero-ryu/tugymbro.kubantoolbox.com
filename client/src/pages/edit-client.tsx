import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const editClientSchema = z.object({
  age: z.union([z.string(), z.number()]).optional().transform(val => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = typeof val === 'string' ? parseInt(val) : val;
    return isNaN(num) ? undefined : num;
  }).refine(val => val === undefined || (val >= 13 && val <= 100), "Age must be between 13 and 100"),
  height: z.union([z.string(), z.number()]).optional().transform(val => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }).refine(val => val === undefined || (val >= 100 && val <= 250), "Height must be between 100 and 250 cm"),
  weight: z.union([z.string(), z.number()]).optional().transform(val => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }).refine(val => val === undefined || (val >= 30 && val <= 300), "Weight must be between 30 and 300 kg"),
  bodyGoal: z.string().optional(),
  clientPaymentPlanId: z.string().optional().transform(val => val === "none" ? undefined : val),
  paymentStatus: z.enum(['active', 'overdue', 'suspended']).optional(),
});

type EditClientForm = z.infer<typeof editClientSchema>;

const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

const formatBillingCycle = (type: string) => {
  switch (type) {
    case "monthly":
      return "Monthly";
    case "weekly":
      return "Weekly";
    case "per_session":
      return "Per Session";
    default:
      return type;
  }
};

export default function EditClient() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/clients/:clientId/edit");
  const clientId = params?.clientId;

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

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId && !!user && user.role === 'trainer',
  });

  // Load trainer's client payment plans
  const { data: paymentPlans = [] } = useQuery({
    queryKey: ["/api/client-payment-plans"],
    enabled: !!user && user.role === 'trainer',
  });

  const form = useForm<EditClientForm>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      age: client?.age || undefined,
      height: client?.height || undefined,
      weight: client?.weight || undefined,
      bodyGoal: client?.bodyGoal || '',
      clientPaymentPlanId: client?.clientPaymentPlanId || "none",
      paymentStatus: client?.paymentStatus || 'active',
    },
  });

  // Update form values when client data loads
  useEffect(() => {
    if (client) {
      form.reset({
        age: client.age || undefined,
        height: client.height || undefined,
        weight: client.weight || undefined,
        bodyGoal: client.bodyGoal || '',
        clientPaymentPlanId: client.clientPaymentPlanId || "none",
        paymentStatus: client.paymentStatus || 'active',
      });
    }
  }, [client, form]);

  const updateClientMutation = useMutation({
    mutationFn: async (data: EditClientForm) => {
      // If clientPaymentPlanId is being updated, use the specific endpoint for that
      if (data.clientPaymentPlanId !== client?.clientPaymentPlanId) {
        await apiRequest("PUT", `/api/clients/${clientId}/payment-plan`, {
          clientPaymentPlanId: data.clientPaymentPlanId
        });
      }
      
      // Update other client data (excluding clientPaymentPlanId since it's handled above)
      const { clientPaymentPlanId, ...clientData } = data;
      return await apiRequest('PUT', `/api/clients/${clientId}`, clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers/clients"] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      setLocation(`/clients/${clientId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditClientForm) => {
    updateClientMutation.mutate(data);
  };

  if (isLoading || clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.role !== 'trainer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is only available to trainers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground">The requested client could not be found.</p>
            <Link href="/clients">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getUserInitials = () => {
    const firstName = client.user?.firstName || client.firstName || '';
    const lastName = client.user?.lastName || client.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'CL';
  };

  const getUserDisplayName = () => {
    const firstName = client.user?.firstName || client.firstName || '';
    const lastName = client.user?.lastName || client.lastName || '';
    return `${firstName} ${lastName}`.trim() || client.user?.email || 'Unknown Client';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${clientId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Client
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={client.user?.profileImageUrl} alt={getUserDisplayName()} />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Edit {getUserDisplayName()}</h1>
              <p className="text-muted-foreground">{client.user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter age"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter height in cm"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter weight in kg"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientPaymentPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Plan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Payment Plan</SelectItem>
                          {paymentPlans.map((plan: any) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - {formatCurrency(plan.amount, plan.currency)} ({formatBillingCycle(plan.type)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bodyGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Goal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the client's fitness goals..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Link href={`/clients/${clientId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateClientMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}