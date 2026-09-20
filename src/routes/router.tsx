import { createBrowserRouter } from "react-router-dom";
import { PlaceholderPage } from "../components/PlaceholderPage";
import { Login } from "../features/auth/Login";
import { Register } from "../features/auth/Register";
import { EventDetailRoute } from "../features/events/EventDetail";
import { EventFormPage } from "../features/events/EventForm";
import { EventList } from "../features/events/EventList";
import { Home } from "../features/home/Home";
import { SongDetailRoute } from "../features/songs/SongDetail";
import { SongList } from "../features/songs/SongList";
import { StageRoute } from "../features/stage/Stage";
import { AppLayout, RequireAuth } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/songs", element: <SongList /> },
          { path: "/songs/new", element: <PlaceholderPage title="Nova música" /> },
          { path: "/songs/:id", element: <SongDetailRoute /> },
          { path: "/songs/:id/edit", element: <PlaceholderPage title="Editar música" /> },
          { path: "/events", element: <EventList /> },
          { path: "/events/new", element: <EventFormPage /> },
          { path: "/events/:id", element: <EventDetailRoute /> },
          { path: "/events/:id/edit", element: <EventFormPage /> },
          { path: "/profile", element: <PlaceholderPage title="Perfil" /> },
        ],
      },
      // Modo palco ocupa a janela inteira: fora do layout com menu lateral.
      { path: "/events/:id/stage", element: <StageRoute /> },
    ],
  },
]);
