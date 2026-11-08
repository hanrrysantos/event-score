import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import Layout from './components/Layout';
import Configuracao from './pages/configuracao/Configuracao';
import Eventos from './pages/eventos/Eventos';
import Grupos from './pages/grupos/Grupos';
import Participantes from './pages/participantes/Participantes';
import Login from './pages/Login';
import './index.css';

// shortcut: telas ainda não feitas mostram só o título; trocar por cada tela conforme ficar pronta.
function EmBreve({ titulo }: { titulo: string }) {
  return (
    <header className="hero">
      <div>
        <h1>{titulo}</h1>
        <p>Tela em construção.</p>
      </div>
    </header>
  );
}

const telas = [
  ['desafios', 'Desafios'],
  ['apuracao', 'Apuração individual'],
  ['frequencia', 'Frequência diária'],
  ['lancamentos', 'Lançamentos'],
  ['relatorios', 'Relatórios'],
];

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/evento" replace /> },
      { path: 'evento', element: <Eventos /> },
      { path: 'evento/:eventoId/configuracao', element: <Configuracao /> },
      { path: 'grupos', element: <Grupos /> },
      { path: 'participantes', element: <Participantes /> },
      ...telas.map(([path, titulo]) => ({ path, element: <EmBreve titulo={titulo} /> })),
      { path: '*', element: <Navigate to="/evento" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
