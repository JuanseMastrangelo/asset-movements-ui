import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Assets from './pages/Assets';
import { Transactions } from './pages/Transactions';
import { Clients } from './pages/Clients';
import { Users } from './pages/Users';
import { TransactionRules } from './pages/TransactionRules';
import { Logistics } from './pages/Logistics';
import { Denominations } from './pages/Denominations';
import { TransactionHistory } from './pages/TransactionHistory';
import { Conciliations } from './pages/Conciliations';
import { AuditPage } from './pages/Audit';

const AppRoutes = () => {
  const protectedRoutes = [
    { path: "/", element: <Home /> },
    { path: "/assets", element: <Assets /> },
    { path: "/transactions/:id?", element: <Transactions /> },
    { path: "/clients/:clientName?", element: <Clients /> },
    { path: "/settings/users", element: <Users /> },
    { path: "/transaction-rules", element: <TransactionRules /> },
    { path: "/logistics", element: <Logistics /> },
    { path: "/denominations", element: <Denominations /> },
    { path: "/transaction-history", element: <TransactionHistory /> },
    { path: "/conciliations", element: <Conciliations /> },
    { path: "/audit", element: <AuditPage /> },
  ];

  
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rutas protegidas */}
      {protectedRoutes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute>
              <Layout>{element}</Layout>
            </ProtectedRoute>
          }
        />
      ))}

      {/* Ruta por defecto */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes; 