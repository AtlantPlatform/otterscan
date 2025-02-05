import { FC, memo, useContext } from "react";
import ETHScanLogoSingle from "./ethscanlogosingle.png";
import { RuntimeContext } from "./useRuntime";

const Logo: FC = () => {
  const { config } = useContext(RuntimeContext);

  return (
    <div className="flex cursor-default items-center justify-center space-x-4 font-title text-6xl font-bol">
      <img
        className="rounded-full"
        src={ETHScanLogoSingle}
        width={96}
        height={96}
        alt="Ethscan logo"
        title="Ethscan logo"
      />
      <span data-test="logotext">Ethscan</span>
    </div>
  );
};

export default memo(Logo);
