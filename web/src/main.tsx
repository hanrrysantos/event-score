import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import Layout from './components/Layout';
import Eventos from './pages/eventos/Eventos';
import Grupos from './pages/grupos/Grupos';
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
  ['participantes', 'Participantes'],
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
      { path: 'grupos', element: <Grupos /> },
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
