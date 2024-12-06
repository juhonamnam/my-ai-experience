import { useContext } from "react";
import { CamContext } from "./context";

export const Cam = () => {
  const { videoRef } = useContext(CamContext);

  return <video width="100%" height="100%" autoPlay ref={videoRef} />;
};
