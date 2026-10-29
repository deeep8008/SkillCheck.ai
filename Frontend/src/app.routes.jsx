import { createBrowserRouter } from "react-router";
import Register from "./features/auth/pages/Register";
import Login from "./features/auth/pages/Login";
import { Workspace, Dashboard, Report, History, NotFound } from "./features/workspace/Workspace";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { element: <Workspace />, children: [
    { path: "/", element: <Dashboard /> },
    { path: "/history", element: <History /> },
    { path: "/analysis/sample", element: <Report /> },
    { path: "*", element: <NotFound /> },
  ] },
]);
