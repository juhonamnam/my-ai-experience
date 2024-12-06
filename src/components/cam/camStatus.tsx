import { useContext, useEffect, useState } from "react";
import { CamContext } from "./context";

export const CamStatus = () => {
  const [fps, setFps] = useState<number | null>(null);
  const { predictCountRef, errorMessage, camDataHandlerRef } =
    useContext(CamContext);

  useEffect(() => {
    const interval = setInterval(() => {
      if (predictCountRef.current === null) {
        setFps(null);
      } else {
        setFps(predictCountRef.current);
        predictCountRef.current = 0;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [predictCountRef, camDataHandlerRef]);

  return (
    <div className="mt-1">
      {fps !== null && <div>Prediction Speed: {fps} FPS</div>}
      {errorMessage !== null && (
        <div className="text-danger">Error: {errorMessage}</div>
      )}
    </div>
  );
};
