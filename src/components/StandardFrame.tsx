import React, { PropsWithChildren } from "react";

const StandardFrame: React.FC<PropsWithChildren> = ({ children }) => (
  <div className="grow pb-12 pt-3 overflow-x-hidden">{children}</div>
);

export default StandardFrame;
