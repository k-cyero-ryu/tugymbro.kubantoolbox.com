import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Clock, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import RoleSelection from "@/pages/role-selection";
import SuperAdminSetup from "@/pages/superadmin-setup";
import ClientRegistration from "@/pages/client-registration";
import TrainerDashboard from "@/pages/trainer-dashboard";
import ClientDashboard from "@/pages/client-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import ManageTrainersPage from "@/pages/manage-trainers";
import AdminClients from "@/pages/admin-clients";
import AdminPlans from "@/pages/admin-plans";
import AdminExercises from "@/pages/admin-exercises";
import UserManagement from "@/pages/user-management";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import EditClient from "@/pages/edit-client";
import PaymentPlans from "@/pages/payment-plans";
import ClientPaymentPlansPage from "@/pages/client-payment-plans";
import TrainingPlans from "@/pages/training-plans";
import TrainingPlanDetail from "@/pages/training-plan-detail";
import ClientTrainingPlanDetail from "@/pages/client-training-plan-detail";
import ClientTrainingPlans from "@/pages/client-training-plans";
import MonthlyEvaluation from "@/pages/monthly-evaluation";
import MonthlyEvaluationComparison from "@/pages/monthly-evaluation-comparison";
import ClientProfile from "@/pages/client-profile";
import DailyWorkout from "@/pages/daily-workout";
import Exercises from "@/pages/exercises";
import Reports from "@/pages/reports";
import ClientEvaluationDetail from "@/pages/client-evaluation-detail";
import ClientEvaluationsList from "@/pages/client-evaluations-list";
import ClientEvaluationsCompare from "@/pages/client-evaluations-compare";
import Navigation from "@/components/navigation";
import Chat from "@/components/chat";
import "@/lib/i18n";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/" component={Landing} />
        <Route path="*">
          {/* Redirect any other path to login for unauthenticated users */}
          {() => { 
            window.location.href = '/login';
            return null;
          }}
        </Route>
      </Switch>
    );
  }

  // If user is authenticated but has default 'client' role and no associated records, show role selection
  if (user && user.role === 'client' && !(user as any).client) {
    return <RoleSelection />;
  }

  // If user is a trainer but pending approval
  if (user && user.role === 'trainer' && user.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          {/* Main Status Card */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Account Pending Approval</h1>
              <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
                Your trainer account is under review. You'll receive access once approved by our administrators.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Review Time:</strong> This usually takes 24-48 hours.
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => window.location.href = "/api/logout"}
                className="mt-4"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Help & Support Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                Need Help with Your Application?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Have questions about the approval process or need to provide additional information? 
                  Our support team is here to help you complete your trainer registration.
                </p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Common Requirements:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Valid fitness certification or credentials</li>
                    <li>• Professional experience documentation</li>
                    <li>• Clear profile information and expertise areas</li>
                  </ul>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => setIsChatOpen(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support Team
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chat Dialog */}
          <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
            <DialogContent className="max-w-4xl h-[600px] p-0">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Support Center - Account Approval Help
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="lg:pl-72">
        <main className="min-h-screen pt-16 lg:pt-0">
          <div className="py-6 px-4 lg:px-8">
            <Switch>
              {user?.role === 'superadmin' && (
                <>
                  <Route path="/" component={AdminDashboard} />
                  <Route path="/manage-trainers" component={ManageTrainersPage} />
                  <Route path="/admin-clients" component={AdminClients} />
                  <Route path="/admin-plans" component={AdminPlans} />
                  <Route path="/admin-exercises" component={AdminExercises} />
                  <Route path="/payment-plans" component={PaymentPlans} />
                  <Route path="/user-management" component={UserManagement} />
                </>
              )}
              {user?.role === 'trainer' && (
                <>
                  <Route path="/" component={TrainerDashboard} />
                  <Route path="/clients" component={Clients} />
                  <Route path="/clients/:clientId/edit" component={EditClient} />
                  <Route path="/clients/:clientId" component={ClientDetail} />
                  <Route path="/clients/:clientId/evaluations" component={ClientEvaluationsList} />
                  <Route path="/clients/:clientId/evaluations/compare" component={ClientEvaluationsCompare} />
                  <Route path="/clients/:clientId/evaluation/:evaluationId" component={ClientEvaluationDetail} />
                  <Route path="/training-plans" component={TrainingPlans} />
                  <Route path="/training-plans/:planId" component={TrainingPlanDetail} />
                  <Route path="/exercises" component={Exercises} />
                  <Route path="/client-payment-plans" component={ClientPaymentPlansPage} />
                  <Route path="/reports" component={Reports} />
                </>
              )}
              {user?.role === 'client' && (
                <>
                  <Route path="/" component={ClientDashboard} />
                  <Route path="/my-training-plans" component={ClientTrainingPlans} />
                  <Route path="/my-training-plan/:planId" component={ClientTrainingPlanDetail} />
                  <Route path="/daily-workout" component={DailyWorkout} />
                  <Route path="/monthly-evaluation" component={MonthlyEvaluation} />
                  <Route path="/monthly-evaluation-comparison" component={MonthlyEvaluationComparison} />
                  <Route path="/profile" component={ClientProfile} />
                </>
              )}
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
      {isAuthenticated && <Chat />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/setup-superadmin" component={SuperAdminSetup} />
          <Route path="/register/client" component={ClientRegistration} />
          <Route component={Router} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
