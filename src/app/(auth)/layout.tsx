import { createClient } from "@/utils/supabase/server";
import { ReactNode } from "react";
import GoogleLoginButton from "../auth/login/_/components/GoogleLoginButton";

import { Separator } from "@/components/ui/separator";
import AuthProvider from "./_components/AuthProvider";
import PathBreadcrumb from "./_components/header/PathBreadcrumb";
import { ModeSelectDropdown } from "./_components/nav/ModeSelectDropdown";

type Props = {
  children: ReactNode;
};

const layout = async ({ children }: Props) => {
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();

  if (!userRes || userRes.error) return <GoogleLoginButton />;
  return (
    <AuthProvider>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-gray-400 px-4">
        <div>
          <PathBreadcrumb />
        </div>
        <div className="ms-auto" />

        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <ModeSelectDropdown />
      </header>
      {children}
    </AuthProvider>
  );
};

export default layout;
