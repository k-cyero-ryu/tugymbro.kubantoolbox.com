import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Home, 
  Users, 
  Dumbbell, 
  BarChart3, 
  MessageCircle, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
  CreditCard,
  UserCheck,
  Activity,
  User,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import LanguageSelector from "@/components/language-selector";

export default function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();


  if (!isAuthenticated) return null;

  const userRole = user?.role || 'client';

  const navigationItems = [
    { 
      href: '/', 
      label: t('nav.dashboard'), 
      icon: Home,
      roles: ['superadmin', 'trainer', 'client']
    },
    { 
      href: '/manage-trainers', 
      label: t('admin.totalTrainers'), 
      icon: Users,
      roles: ['superadmin']
    },
    { 
      href: '/admin-clients', 
      label: t('admin.totalClients'), 
      icon: UserCheck,
      roles: ['superadmin']
    },
    { 
      href: '/admin-plans', 
      label: t('plans.trainingPlans'), 
      icon: Dumbbell,
      roles: ['superadmin']
    },
    { 
      href: '/admin-exercises', 
      label: t('exercises.library'), 
      icon: Activity,
      roles: ['superadmin']
    },
    { 
      href: '/payment-plans', 
      label: t('nav.paymentPlans'), 
      icon: CreditCard,
      roles: ['superadmin']
    },
    { 
      href: '/user-management', 
      label: t('nav.userManagement'), 
      icon: UserCog,
      roles: ['superadmin']
    },
    { 
      href: '/profile', 
      label: t('nav.profile'), 
      icon: User,
      roles: ['trainer']
    },
    { 
      href: '/clients', 
      label: t('nav.clients'), 
      icon: Users,
      roles: ['trainer']
    },
    { 
      href: '/training-plans', 
      label: t('nav.plans'), 
      icon: Dumbbell,
      roles: ['trainer']
    },
    { 
      href: '/daily-workout', 
      label: t('nav.dailyWorkout'), 
      icon: Activity,
      roles: ['client']
    },
    { 
      href: '/my-training-plans', 
      label: t('nav.plans'), 
      icon: Dumbbell,
      roles: ['client']
    },
    { 
      href: '/monthly-evaluation', 
      label: t('client.monthlyEvaluation'), 
      icon: Calendar,
      roles: ['client']
    },
    { 
      href: '/profile', 
      label: t('nav.profile'), 
      icon: User,
      roles: ['client']
    },
    { 
      href: '/exercises', 
      label: t('nav.exercises'), 
      icon: Dumbbell,
      roles: ['trainer']
    },
    { 
      href: '/client-payment-plans', 
      label: t('nav.clientPaymentPlans'), 
      icon: CreditCard,
      roles: ['trainer'] 
    },
    { 
      href: '/reports', 
      label: t('nav.reports'), 
      icon: BarChart3,
      roles: ['trainer']
    },
    { 
      href: '/community', 
      label: t('nav.communityChat'), 
      icon: MessageCircle,
      roles: ['trainer', 'client']
    },
    { 
      href: '/social', 
      label: t('nav.social', 'Social'), 
      icon: MessageCircle,
      roles: ['superadmin', 'trainer', 'client']
    }
  ].filter(item => item.roles.includes(userRole));

  const getUserDisplayName = () => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user?.email || 'User';
  };

  const getUserInitials = () => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const SidebarItems = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="space-y-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start h-12 px-3",
                isActive && "bg-blue-600 text-white hover:bg-blue-700",
                collapsed && "px-2"
              )}
              onClick={() => setIsSidebarOpen(false)}
            >
              <Icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:w-72",
        isCollapsed && "lg:w-20"
      )}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 px-6 pb-4">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            {!isCollapsed && (
              <Link href="/">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  My Body Trainer Manager
                </h1>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <SidebarItems collapsed={isCollapsed} />
            
            {/* User Profile at Bottom */}
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
              {!isCollapsed && <LanguageSelector />}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start h-12 mt-2",
                      isCollapsed && "px-2"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user?.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {userRole}
                        </p>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{getUserDisplayName()}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {userRole}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('nav.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        <div className="flex-1">
          <Link href="/">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Body Trainer Manager
            </h1>
          </Link>
        </div>

        <LanguageSelector />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{getUserDisplayName()}</p>
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white hover:bg-gray-700"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-900 px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <Link href="/">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                      My Body Trainer Manager
                    </h1>
                  </Link>
                </div>
                <nav className="flex flex-1 flex-col">
                  <SidebarItems />
                  
                  <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {userRole}
                        </p>
                      </div>
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}