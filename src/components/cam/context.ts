import { createContext, MutableRefObject } from "react";
import { CamDataHandler, Clear, SetCamDataHandler } from "./type";

export const CamContext = createContext<{
  flipRef: MutableRefObject<boolean>;
  camDataHandlerRef: MutableRefObject<CamDataHandler | null>;
  setCamDataHandler: SetCamDataHandler;
  clear: Clear;
  predictCountRef: MutableRefObject<number | null>;
  videoRef: MutableRefObject<HTMLVideoElement>;
  devices: { label: string; value: string }[];
  errorMessage: string | null;
}>({
  flipRef: { current: false },
  camDataHandlerRef: { current: null },
  setCamDataHandler: () => {},
  clear: () => {},
  predictCountRef: { current: null },
  videoRef: { current: {} as HTMLVideoElement },
  devices: [],
  errorMessage: null,
});
