import { Counter } from "./components/Counter";
import { FetchData } from "./components/FetchData";
import { Home } from "./components/Home";
import { Activity } from "./components/Activity";
import { ApiLogTracker } from "./components/ApiLogTracker";

const AppRoutes = [
  {
    index: true,
    element: <Home />,
  },
  {
    path: "/counter",
    element: <Counter />,
  },
  {
    path: "/fetch-data",
    element: <FetchData />,
  },
  {
    path: "/activity",
    element: <Activity />,
  },
  {
    path: "/logs",
    element: <ApiLogTracker />,
  },
];

export default AppRoutes;
