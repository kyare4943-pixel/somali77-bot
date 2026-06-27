import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useGetMe();

  useEffect(() => {
    if (!isLoading && (error || !data?.authenticated)) {
      setLocation("/");
    }
  }, [isLoading, error, data, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (error || !data?.authenticated) {
    return null;
  }

  return <>{children}</>;
}
