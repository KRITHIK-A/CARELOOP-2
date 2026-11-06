import { RouterProvider } from "react-router";
import { AppStore } from "@/app/AppStore";
import { router } from "@/app/routes";

export default function App() {
  return (
    <AppStore>
      <RouterProvider router={router} />
    </AppStore>
  );
}
