import { createBrowserRouter } from "react-router-dom";
import { Login } from "../features/auth/Login";
import { Register } from "../features/auth/Register";
import { ResetPassword } from "../features/auth/ResetPassword";
import { EventDetailRoute } from "../features/events/EventDetail";
import { EventFormPage } from "../features/events/EventForm";
import { EventList } from "../features/events/EventList";
import { Home } from "../features/home/Home";
import { Profile } from "../features/profile/Profile";
import { ProgramPage } from "../features/program/ProgramPage";
import { SongDetailRoute } from "../features/songs/SongDetail";
import { SongFormPage } from "../features/songs/SongForm";
import { SongList } from "../features/songs/SongList";
import { StageRoute } from "../features/stage/Stage";
import { AppLayout, RequireAuth } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/reset-password", element: <ResetPassword /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/songs", element: <SongList /> },
          { path: "/songs/new", element: <SongFormPage /> },
          { path: "/songs/:id", element: <SongDetailRoute /> },
          { path: "/songs/:id/edit", element: <SongFormPage /> },
          { path: "/events", element: <EventList /> },
          { path: "/events/new", element: <EventFormPage /> },
          { path: "/events/:id", element: <EventDetailRoute /> },
          { path: "/events/:id/edit", element: <EventFormPage /> },
          { path: "/events/:id/program", element: <ProgramPage /> },
          { path: "/profile", element: <Profile /> },
        ],
      },
      // Modo palco ocupa a janela inteira: fora do layout com menu lateral.
      { path: "/events/:id/stage", element: <StageRoute /> },
    ],
  },
]);
