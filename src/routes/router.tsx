import { createBrowserRouter } from "react-router-dom";
import { PlaceholderPage } from "../components/PlaceholderPage";
import { Login } from "../features/auth/Login";
import { Register } from "../features/auth/Register";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <PlaceholderPage title="Início" /> },
      { path: "/songs", element: <PlaceholderPage title="Músicas" /> },
      { path: "/events", element: <PlaceholderPage title="Eventos" /> },
      { path: "/profile", element: <PlaceholderPage title="Perfil" /> },
    ],
  },
]);
