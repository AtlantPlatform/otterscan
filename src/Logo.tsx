import { FC, memo, useContext } from "react";
// @ts-expect-error
import Otter from "./otter.png?w=128&h=128&webp";
import ETHScanLogo from "./ethscanlogo.png";
import { RuntimeContext } from "./useRuntime";

const Logo: FC = () => {
  const { config } = useContext(RuntimeContext);

  return (
    <div className="flex cursor-default items-center justify-center space-x-4 font-title text-6xl font-bol">
      <img
        className="rounded-full"
        src={ETHScanLogo}
        alt="An otter scanning"
        title="An otter scanning"
      />
    </div>
  );
};

export default memo(Logo);
