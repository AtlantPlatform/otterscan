import React, { FC, useContext, Suspense, lazy } from "react";
import { RuntimeContext } from "../../useRuntime";
import { useTxData } from "../../useErigonHooks";
import StandardSelectionBoundary from "../../selection/StandardSelectionBoundary";

const StateDiff = lazy(() => import("./StateDiff"));

interface StateDiffClientProps {
  txHash: string;
}

/**
 * Client-side wrapper for StateDiff component.
 * Fetches transaction data using RuntimeContext and renders the StateDiff component.
 */
const StateDiffClient: FC<StateDiffClientProps> = ({ txHash }) => {
  const { provider } = useContext(RuntimeContext);
  const txData = useTxData(provider, txHash);

  if (!txData) {
    return (
      <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto text-sm">
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
          <div className="mb-5 mt-4 flex flex-col items-start space-y-3 overflow-x-auto text-sm">
            <div className="h-7 w-96 rounded border px-1 py-1 hover:border-gray-500">
              <div className="h-full w-full animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>
        }
      >
        <StateDiff txData={txData} txHash={txHash} />
      </Suspense>
    </StandardSelectionBoundary>
  );
};

export default StateDiffClient;
