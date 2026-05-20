import React from "react";
import { useMethodSelector } from "../use4Bytes";

type MethodNameProps = {
  data: string;
  to?: string;
  // Pre-resolved 4byte name from the backend. When present, render directly
  // (no client SWR roundtrip, label is already in the SSR HTML).
  name?: string | null;
};

const MethodName: React.FC<MethodNameProps> = ({ data, to = undefined, name }) => {
  const [isSimpleTransfer, clientName, methodTitleFallback] =
    useMethodSelector(data, to);
  const methodName = name ?? clientName;
  const methodTitle =
    name !== undefined && name !== null ? name : methodTitleFallback;

  return (
    <div
      className="method-badge flex min-h-full max-w-max items-baseline rounded-lg px-3 py-1 text-xs"
    >
      <p
        className="truncate"
        title={methodTitle}
      >
        {methodName}
      </p>
    </div>
  );
};

export default React.memo(MethodName);
