import { FC, PropsWithChildren } from "react";

type ContentFrameProps = {
  tabs?: boolean;
  isLoading?: boolean;
  marginSize?: "normal" | "small" | "none";
};

const ContentFrame: FC<PropsWithChildren<ContentFrameProps>> = ({
  tabs,
  isLoading,
  marginSize = "normal",
  children,
}) => {
  const marginClass = marginSize === "small" ? "mx-2 lg:mx-6" : marginSize === "none" ? "" : "mx-3 lg:mx-9";

  return tabs ? (
    <div className={marginClass}>
      <div
        className={`divide-y rounded-b-lg border bg-white px-3 overflow-hidden ${
          isLoading && "opacity-50 transition-opacity"
        }`}
      >
        {children}
      </div>
    </div>
  ) : (
    <div className={marginClass}>
      <div
        className={`divide-y rounded-lg border bg-white px-3 overflow-hidden ${
          isLoading && "opacity-50 transition-opacity"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default ContentFrame;
