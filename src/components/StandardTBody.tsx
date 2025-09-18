import { FC, PropsWithChildren } from "react";

const StandardTBody: FC<PropsWithChildren> = ({ children }) => (
  <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200">
    {children}
  </tbody>
);

export default StandardTBody;
