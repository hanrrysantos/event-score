import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import Layout from './components/Layout';
import Apuracao from './pages/apuracao/Apuracao';
import Configuracao from './pages/configuracao/Configuracao';
import Desafios from './pages/desafios/Desafios';
import Eventos from './pages/eventos/Eventos';
import Frequencia from './pages/frequencia/Frequencia';
import Grupos from './pages/grupos/Grupos';
import Lancamentos from './pages/lancamentos/Lancamentos';
import Login from './pages/Login';
import Participantes from './pages/participantes/Participantes';
import Relatorios from './pages/relatorios/Relatorios';
import './index.css';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/evento" replace /> },
      { path: 'evento', element: <Eventos /> },
      { path: 'evento/:eventoId/configuracao', element: <Configuracao /> },
      { path: 'grupos', element: <Grupos /> },
      { path: 'desafios', element: <Desafios /> },
      { path: 'participantes', element: <Participantes /> },
      { path: 'apuracao', element: <Apuracao /> },
      { path: 'frequencia', element: <Frequencia /> },
      { path: 'lancamentos', element: <Lancamentos /> },
      { path: 'relatorios', element: <Relatorios /> },
      { path: '*', element: <Navigate to="/evento" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
