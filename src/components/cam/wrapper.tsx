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
  const [devices, setDevices] = useState<{ label: string; value: string }[]>(
    [],
  );
  const flipRef = useRef(camLocalStorage.getFlip());
  const setCamDataHandler: SetCamDataHandler = (p) => {
    camDataHandlerRef.current = p;
  };

  const clear: Clear = () => {
    camDataHandlerRef.current = null;
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const d: { label: string; value: string }[] = [];
      devices.forEach((device) => {
        if (device.kind === "videoinput") {
          d.push({ value: device.deviceId, label: device.label });
        }
      });
      let selectedDevice = camLocalStorage.getSelectedDeviceId();
      if (!d.find((device) => device.value === selectedDevice)) {
        selectedDevice = d[0]?.value;
        camLocalStorage.setSelectedDeviceId(selectedDevice);
      }
      navigator.mediaDevices
        .getUserMedia({
          video: {
            deviceId: d[0].value,
          },
        })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        });
      setDevices(d);
    });

    if (flipRef.current) {
      videoRef.current.style.transform = "scaleX(-1)";
    }

    let unmounted = false;

    let frameId = 0;

    const handle = async () => {
      if (unmounted) return;
      if (camDataHandlerRef?.current) {
        try {
          await camDataHandlerRef.current(videoRef.current);
          if (predictCountRef.current === null) predictCountRef.current = 1;
          else predictCountRef.current++;
          setErrorMessage(null);
        } catch (e) {
          predictCountRef.current = null;
          console.error(e);
          if (e instanceof Error) setErrorMessage(e.message);
          else setErrorMessage(String(e));
          await wait(1000);
        }
      } else {
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
        devices,
        errorMessage,
      }}
    >
      {children}
    </CamContext.Provider>
  );
};
