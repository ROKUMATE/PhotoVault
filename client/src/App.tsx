import { useEffect } from "react";
import toast from "react-hot-toast";
import { DashboardPage } from "./components/DashboardPage";
import { LoginPage } from "./components/LoginPage";
import { useAuthSession } from "./hooks/useAuthSession";

function App() {
  const auth = useAuthSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("accountAdded") === "1" || params.get("added") === "1") {
      toast.success("Account added!");
      params.delete("accountAdded");
      params.delete("added");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, []);

  if (!auth.isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <DashboardPage
      onAddAccount={auth.addAccount}
      onAvatarClick={() => {
        auth.signOut();
        toast.success("Signed out");
      }}
    />
  );
}

export default App;