import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DashboardPage } from "./components/DashboardPage";
import { LoginPage } from "./components/LoginPage";
import { SettingsPage } from "./components/SettingsPage";
import { useAuthSession } from "./hooks/useAuthSession";

function App() {
  const auth = useAuthSession();
  const [pathname, setPathname] = useState(window.location.pathname);
  const isSettingsPath = pathname.startsWith("/settings");

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goToSettings = () => {
    window.history.pushState({}, "", "/settings");
    setPathname("/settings");
  };

  const goToDashboard = () => {
    window.history.pushState({}, "", "/");
    setPathname("/");
  };

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

    const authError = params.get("authError");
    if (authError) {
      toast.error(authError);
      params.delete("authError");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, []);

  if (!auth.isAuthenticated) {
    return <LoginPage />;
  }

  if (isSettingsPath) {
    return (
      <SettingsPage
        onAddAccount={auth.addAccount}
        onOpenDashboard={goToDashboard}
        onAvatarClick={() => {
          auth.signOut();
          toast.success("Signed out");
          goToDashboard();
        }}
      />
    );
  }

  return (
    <DashboardPage
      onAddAccount={auth.addAccount}
      onOpenSettings={goToSettings}
      onAvatarClick={() => {
        auth.signOut();
        toast.success("Signed out");
      }}
    />
  );
}

export default App;