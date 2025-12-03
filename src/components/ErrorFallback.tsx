import React from "react";
import { FallbackProps } from "react-error-boundary";
import StandardSubtitle from "../components/StandardSubtitle";
import ContentFrame from "./ContentFrame";
import StandardFrame from "./StandardFrame";

const ErrorFallback: React.FC<FallbackProps> = ({ error }) => {
  const pathname = typeof document !== 'undefined' ? document.location.pathname : '/';

  return (
    <StandardFrame>
      <ContentFrame>
        <div className="pt-2">
          <StandardSubtitle>Something went wrong!</StandardSubtitle>
        </div>

        <div className="p-2">
          <div className="text-lg pb-2">The site encountered an error.</div>

          <pre className="bg-red-100 text-xs mt-2 rounded p-2 border border-red-500 mb-2">
            {pathname + "\n\n" + error.toString() + "\n\n"}

            {error.stack}
          </pre>
        </div>
      </ContentFrame>
    </StandardFrame>
  );
};

export default ErrorFallback;
