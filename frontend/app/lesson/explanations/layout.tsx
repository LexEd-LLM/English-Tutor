import type { PropsWithChildren } from "react";

const ExplanationsLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full w-full flex-col">{children}</div>
    </div>
  );
};

export default ExplanationsLayout; 