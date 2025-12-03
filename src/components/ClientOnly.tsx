import { FC, ReactNode, useEffect, useState } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrapper component that only renders its children on the client side.
 * Use this for components that access browser-only APIs like:
 * - window
 * - document
 * - localStorage
 * - navigator
 * - matchMedia
 */
const ClientOnly: FC<ClientOnlyProps> = ({ children, fallback = null }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : <>{fallback}</>;
};

export default ClientOnly;
