import React from "react";
import { useMethodSelector } from "../use4Bytes";

type MethodNameProps = {
  data: string;
  to?: string;
};

const MethodName: React.FC<MethodNameProps> = ({ data, to = undefined }) => {
  const [isSimpleTransfer, methodName, methodTitle, fromVerifiedContract] =
    useMethodSelector(data, to);

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
