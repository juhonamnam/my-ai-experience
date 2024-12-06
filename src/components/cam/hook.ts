import { useContext } from "react";
import { CamContext } from "./context";

export const useCamData = () => {
  const { setCamDataHandler, clear, flipRef } = useContext(CamContext);
  return { setCamDataHandler, clear, flipRef };
};
