import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from './pages/Layout.jsx';
import RedTeamHome from './pages/RedTeamHome.jsx';
import CustomPage from './pages/CustomPage.jsx';

const LayoutWrapper = ({ children, currentPageName }) => 
  <Layout currentPageName={currentPageName}>{children}</Layout>;

const CustomPageWrapper = () => {
  const { pageKey } = useParams();
  return (
    <LayoutWrapper currentPageName={`note/${pageKey}`}>
      <CustomPage pageKey={pageKey} />
    </LayoutWrapper>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName="RedTeamHome">
          <RedTeamHome />
        </LayoutWrapper>
      } />
      <Route path="/Home" element={<Navigate to="/" replace />} />
      <Route path="/note/:pageKey" element={<CustomPageWrapper />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
