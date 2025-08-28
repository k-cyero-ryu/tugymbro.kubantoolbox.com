import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.clients': 'Clients',
      'nav.plans': 'Plans',
      'nav.exercises': 'Exercises',
      'nav.reports': 'Reports',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.create': 'Create',
      'common.edit': 'Edit',
      'common.delete': 'Delete',
      'common.view': 'View',
      'common.search': 'Search',
      'common.filter': 'Filter',
      'common.export': 'Export',
      
      // Auth
      'auth.signIn': 'Sign In',
      'auth.signOut': 'Sign Out',
      'auth.getStarted': 'Get Started',
      'auth.unauthorized': 'Unauthorized',
      'auth.accessDenied': 'Access Denied',
      
      // Dashboard
      'dashboard.welcome': 'Welcome back!',
      'dashboard.totalClients': 'Total Clients',
      'dashboard.activeClients': 'Active Clients',
      'dashboard.monthlyRevenue': 'Monthly Revenue',
      'dashboard.trainingPlans': 'Training Plans',
      'dashboard.recentActivity': 'Recent Client Activity',
      'dashboard.quickActions': 'Quick Actions',
      'dashboard.clientProgress': 'Client Progress',
      'dashboard.referralCode': 'Your Referral Code',
      'dashboard.upcomingEvaluations': 'Upcoming Evaluations',
      
      // Clients
      'clients.management': 'Client Management',
      'clients.inviteClient': 'Invite Client',
      'clients.searchClients': 'Search clients...',
      'clients.allStatus': 'All Status',
      'clients.active': 'Active',
      'clients.inactive': 'Inactive',
      'clients.noClients': 'No clients found',
      'clients.progress': 'Progress',
      
      // Training Plans
      'plans.trainingPlans': 'Training Plans',
      'plans.createPlan': 'Create Plan',
      'plans.planName': 'Plan Name',
      'plans.duration': 'Duration',
      'plans.description': 'Description',
      'plans.goal': 'Goal',
      'plans.dailyCalories': 'Daily Calories',
      'plans.protein': 'Protein',
      'plans.carbs': 'Carbs',
      'plans.noPlanYet': 'No training plans yet',
      
      // Exercises
      'exercises.library': 'Exercise Library',
      'exercises.addExercise': 'Add Exercise',
      'exercises.exerciseName': 'Exercise Name',
      'exercises.category': 'Category',
      'exercises.uploadMedia': 'Upload Media',
      'exercises.noExercises': 'No exercises yet',
      'exercises.categories': {
        'strength': 'Strength',
        'cardio': 'Cardio',
        'flexibility': 'Flexibility',
        'sports': 'Sports'
      },
      
      // Reports
      'reports.analytics': 'Reports & Analytics',
      'reports.clientGrowth': 'Client Growth',
      'reports.revenueGrowth': 'Revenue Growth',
      'reports.avgProgress': 'Avg. Progress',
      'reports.retentionRate': 'Retention Rate',
      'reports.businessGrowth': 'Business Growth',
      'reports.topPerforming': 'Top Performing Clients',
      'reports.needsAttention': 'Needs Attention',
      
      // Chat
      'chat.messages': 'Messages',
      'chat.typeMessage': 'Type your message...',
      'chat.online': 'Online',
      'chat.noConversations': 'No conversations available',
      
      // Client Dashboard
      'client.dashboard': 'My Dashboard',
      'client.workoutsThisWeek': 'Workouts This Week',
      'client.currentWeight': 'Current Weight',
      'client.goalProgress': 'Goal Progress',
      'client.streak': 'Streak',
      'client.todaysWorkout': 'Today\'s Workout',
      'client.progressOverview': 'Progress Overview',
      'client.monthlyEvaluation': 'Monthly Evaluation',
      'client.completeWorkout': 'Complete Workout',
      
      // Admin
      'admin.dashboard': 'SuperAdmin Dashboard',
      'admin.totalTrainers': 'Total Trainers',
      'admin.activeTrainers': 'Active Trainers',
      'admin.totalClients': 'Total Clients',
      'admin.pendingApprovals': 'Pending Trainer Approvals',
      'admin.systemAnalytics': 'System Analytics',
      'admin.approve': 'Approve',
      'admin.reject': 'Reject',
    }
  },
  es: {
    translation: {
      // Navigation
      'nav.dashboard': 'Panel',
      'nav.clients': 'Clientes',
      'nav.plans': 'Planes',
      'nav.exercises': 'Ejercicios',
      'nav.reports': 'Reportes',
      
      // Common
      'common.loading': 'Cargando...',
      'common.error': 'Error',
      'common.success': 'Éxito',
      'common.cancel': 'Cancelar',
      'common.save': 'Guardar',
      'common.create': 'Crear',
      'common.edit': 'Editar',
      'common.delete': 'Eliminar',
      'common.view': 'Ver',
      'common.search': 'Buscar',
      'common.filter': 'Filtrar',
      'common.export': 'Exportar',
      
      // Auth
      'auth.signIn': 'Iniciar Sesión',
      'auth.signOut': 'Cerrar Sesión',
      'auth.getStarted': 'Comenzar',
      'auth.unauthorized': 'No Autorizado',
      'auth.accessDenied': 'Acceso Denegado',
      
      // Dashboard
      'dashboard.welcome': '¡Bienvenido de vuelta!',
      'dashboard.totalClients': 'Clientes Totales',
      'dashboard.activeClients': 'Clientes Activos',
      'dashboard.monthlyRevenue': 'Ingresos Mensuales',
      'dashboard.trainingPlans': 'Planes de Entrenamiento',
      'dashboard.recentActivity': 'Actividad Reciente de Clientes',
      'dashboard.quickActions': 'Acciones Rápidas',
      'dashboard.clientProgress': 'Progreso de Clientes',
      'dashboard.referralCode': 'Tu Código de Referencia',
      'dashboard.upcomingEvaluations': 'Evaluaciones Próximas',
    }
  },
  fr: {
    translation: {
      // Navigation
      'nav.dashboard': 'Tableau de Bord',
      'nav.clients': 'Clients',
      'nav.plans': 'Plans',
      'nav.exercises': 'Exercices',
      'nav.reports': 'Rapports',
      
      // Common
      'common.loading': 'Chargement...',
      'common.error': 'Erreur',
      'common.success': 'Succès',
      'common.cancel': 'Annuler',
      'common.save': 'Sauvegarder',
      'common.create': 'Créer',
      'common.edit': 'Modifier',
      'common.delete': 'Supprimer',
      'common.view': 'Voir',
      'common.search': 'Rechercher',
      'common.filter': 'Filtrer',
      'common.export': 'Exporter',
      
      // Auth
      'auth.signIn': 'Se Connecter',
      'auth.signOut': 'Se Déconnecter',
      'auth.getStarted': 'Commencer',
      'auth.unauthorized': 'Non Autorisé',
      'auth.accessDenied': 'Accès Refusé',
      
      // Dashboard
      'dashboard.welcome': 'Bon retour !',
      'dashboard.totalClients': 'Total Clients',
      'dashboard.activeClients': 'Clients Actifs',
      'dashboard.monthlyRevenue': 'Revenus Mensuels',
      'dashboard.trainingPlans': 'Plans d\'Entraînement',
      'dashboard.recentActivity': 'Activité Récente des Clients',
      'dashboard.quickActions': 'Actions Rapides',
      'dashboard.clientProgress': 'Progrès des Clients',
      'dashboard.referralCode': 'Votre Code de Parrainage',
      'dashboard.upcomingEvaluations': 'Évaluations Prochaines',
    }
  },
  pt: {
    translation: {
      // Navigation
      'nav.dashboard': 'Painel',
      'nav.clients': 'Clientes',
      'nav.plans': 'Planos',
      'nav.exercises': 'Exercícios',
      'nav.reports': 'Relatórios',
      
      // Common
      'common.loading': 'Carregando...',
      'common.error': 'Erro',
      'common.success': 'Sucesso',
      'common.cancel': 'Cancelar',
      'common.save': 'Salvar',
      'common.create': 'Criar',
      'common.edit': 'Editar',
      'common.delete': 'Excluir',
      'common.view': 'Ver',
      'common.search': 'Pesquisar',
      'common.filter': 'Filtrar',
      'common.export': 'Exportar',
      
      // Auth
      'auth.signIn': 'Entrar',
      'auth.signOut': 'Sair',
      'auth.getStarted': 'Começar',
      'auth.unauthorized': 'Não Autorizado',
      'auth.accessDenied': 'Acesso Negado',
      
      // Dashboard
      'dashboard.welcome': 'Bem-vindo de volta!',
      'dashboard.totalClients': 'Total de Clientes',
      'dashboard.activeClients': 'Clientes Ativos',
      'dashboard.monthlyRevenue': 'Receita Mensal',
      'dashboard.trainingPlans': 'Planos de Treino',
      'dashboard.recentActivity': 'Atividade Recente dos Clientes',
      'dashboard.quickActions': 'Ações Rápidas',
      'dashboard.clientProgress': 'Progresso dos Clientes',
      'dashboard.referralCode': 'Seu Código de Indicação',
      'dashboard.upcomingEvaluations': 'Avaliações Próximas',
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
