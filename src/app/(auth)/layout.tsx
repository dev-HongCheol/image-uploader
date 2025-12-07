import { Separator } from "@/components/ui/separator";
import { ReactNode } from "react";
import AuthProvider from "./_/AuthProvider";
import { ModeSelectDropdown } from "./_/components/header/ModeSelectDropdown";
import PathBreadcrumb from "./_/components/header/PathBreadcrumb";

type Props = {
  children: ReactNode;
};

const layout = async ({ children }: Props) => {
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
