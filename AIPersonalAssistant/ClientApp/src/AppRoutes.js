import { Counter } from "./components/Counter";
import { AIFeatureActivation } from "./components/AIFeatureActivation";
import { Home } from "./components/Home";
import { Activity } from "./components/Activity";
import { ApiLogTracker } from "./components/ApiLogTracker";
import { UserActivation } from "./components/UserActivation";
import { Navigate } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";

const AppRoutes = [
  {
    index: true,
    element: <Home />,
  },
  {
    path: "/dashboard",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/counter",
    element: <Counter />,
  },
  {
    path: "/ai-features",
    element: <AIFeatureActivation />,
  },
  {
    path: "/fetch-data",
    element: <Navigate to="/ai-features" replace />,
  },
  {
    path: "/activity",
    element: <Activity />,
  },
  {
    path: "/logs",
    element: (
      <AdminRoute>
        <ApiLogTracker />
      </AdminRoute>
    ),
  },
  {
    path: "/userActivation",
    element: (
      <AdminRoute>
        <UserActivation />
      </AdminRoute>
    ),
  },
];

export default AppRoutes;
