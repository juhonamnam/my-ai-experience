import {
  MutableRefObject,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import { CamContext } from "./context";
import { camLocalStorage } from "./localStorage";
import { CamDataHandler, SetCamDataHandler, Clear } from "./type";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const CamWrapper = ({ children }: PropsWithChildren) => {
  const camDataHandlerRef = useRef<CamDataHandler | null>(null);
  const predictCountRef = useRef(null as number | null);
  const videoRef = useRef<HTMLVideoElement>(
    null,
  ) as MutableRefObject<HTMLVideoElement>;
  const flipRef = useRef(camLocalStorage.getFlip());
  const setCamDataHandler: SetCamDataHandler = (p) => {
    camDataHandlerRef.current = p;
  };

  const clear: Clear = () => {
    camDataHandlerRef.current = null;
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let unmounted = false;

    let frameId = 0;

    const handle = async () => {
      if (unmounted) return;
      const handler = camDataHandlerRef.current;
      const readyState = videoRef.current.readyState;
      if (handler && readyState === 4) {
        try {
          await handler(videoRef.current);
          if (predictCountRef.current === null) predictCountRef.current = 1;
          else predictCountRef.current++;
          setErrorMessage(null);
        } catch (e) {
          if (handler === camDataHandlerRef.current) {
            predictCountRef.current = null;
            console.error(e);
            if (e instanceof Error) setErrorMessage(e.message);
            else setErrorMessage(String(e));
            await wait(1000);
          }
        }
      } else {
        setErrorMessage(null);
        predictCountRef.current = null;
      }
      frameId = requestAnimationFrame(handle);
    };
    frameId = requestAnimationFrame(handle);

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <CamContext.Provider
      value={{
        flipRef,
        camDataHandlerRef,
        setCamDataHandler,
        clear,
        predictCountRef,
        videoRef,
        errorMessage,
      }}
    >
      {children}
    </CamContext.Provider>
  );
};
