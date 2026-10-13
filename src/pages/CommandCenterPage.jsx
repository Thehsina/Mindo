import React from "react";
import UniversalCommandCenter from "../components/UniversalCommandCenter";

export default function CommandCenterPage() {
  return (
    <div className="h-full w-full flex flex-col min-h-0 max-w-full overflow-hidden">
      <UniversalCommandCenter compact={false} />
    </div>
  );
}
