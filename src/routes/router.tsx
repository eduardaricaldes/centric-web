import { createBrowserRouter } from "react-router-dom";
import { PlaceholderPage } from "../components/PlaceholderPage";
import { Login } from "../features/auth/Login";
import { Register } from "../features/auth/Register";
import { SongDetailRoute } from "../features/songs/SongDetail";
import { SongList } from "../features/songs/SongList";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <PlaceholderPage title="Início" /> },
      { path: "/songs", element: <SongList /> },
      { path: "/songs/new", element: <PlaceholderPage title="Nova música" /> },
      { path: "/songs/:id", element: <SongDetailRoute /> },
      { path: "/songs/:id/edit", element: <PlaceholderPage title="Editar música" /> },
      { path: "/events", element: <PlaceholderPage title="Eventos" /> },
      { path: "/profile", element: <PlaceholderPage title="Perfil" /> },
    ],
  },
]);
