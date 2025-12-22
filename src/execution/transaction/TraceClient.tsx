import React, { FC, useContext, Suspense, lazy } from "react";
import { RuntimeContext } from "../../useRuntime";
import { useTxData } from "../../useErigonHooks";
import StandardSelectionBoundary from "../../selection/StandardSelectionBoundary";

const Trace = lazy(() => import("./Trace"));

interface TraceClientProps {
  txHash: string;
}

/**
 * Client-side wrapper for Trace component.
 * Fetches transaction data using RuntimeContext and renders the Trace component.
 */
const TraceClient: FC<TraceClientProps> = ({ txHash }) => {
  const { provider } = useContext(RuntimeContext);
  const txData = useTxData(provider, txHash);

  if (!txData) {
    return (
      <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto font-code text-sm">
        <div className="h-7 w-96 rounded border px-1 py-1 hover:border-gray-500">
          <div className="h-full w-full animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <StandardSelectionBoundary>
      <Suspense
        fallback={
          <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto font-code text-sm">
            <div className="h-7 w-96 rounded border px-1 py-1 hover:border-gray-500">
              <div className="h-full w-full animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>
        }
      >
        <Trace txData={txData} txHash={txHash} />
      </Suspense>
    </StandardSelectionBoundary>
  );
};

export default TraceClient;
