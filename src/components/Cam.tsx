import {
  useRef,
  useEffect,
  PropsWithChildren,
  createContext,
  useContext,
  MutableRefObject,
  useState,
} from "react";

type CamDataHandler = (input: HTMLVideoElement) => Promise<void>;
type SetCamDataHandler = (cameraHandler: CamDataHandler) => void;
type Clear = () => void;

const CamContext = createContext<{
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

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useCamData = () => {
  const { setCamDataHandler, clear, flipRef } = useContext(CamContext);
  return { setCamDataHandler, clear, flipRef };
};

export const CamWrapper = ({ children }: PropsWithChildren) => {
  const camDataHandlerRef = useRef<CamDataHandler | null>(null);
  const predictCountRef = useRef(null as number | null);
  const videoRef = useRef<HTMLVideoElement>(
    null,
  ) as MutableRefObject<HTMLVideoElement>;
  const [devices, setDevices] = useState<{ label: string; value: string }[]>(
    [],
  );
  const flipRef = useRef(false);
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

export const Cam = () => {
  const { videoRef } = useContext(CamContext);

  return <video width="100%" height="100%" autoPlay ref={videoRef} />;
};

export const CamSelect = () => {
  const { devices, videoRef, flipRef } = useContext(CamContext);

  return (
    <>
      <label>Select Camera</label>
      <select
        className="form-select"
        onChange={(e) => {
          navigator.mediaDevices
            .getUserMedia({
              video: {
                deviceId: e.currentTarget.value,
              },
            })
            .then((stream) => {
              videoRef.current.srcObject = stream;
            });
        }}
      >
        {devices.map((d, idx) => (
          <option key={d.value} value={d.value}>
            {idx + 1}. {d.label || "Camera"}
          </option>
        ))}
      </select>
      <div className="form-check">
        <label className="form-check-label">
          <input
            className="form-check-input"
            type="checkbox"
            onChange={(e) => {
              if (e.currentTarget.checked)
                videoRef.current.style.transform = "scaleX(-1)";
              else videoRef.current.style.transform = "";
              flipRef.current = e.currentTarget.checked;
            }}
          />
          Horizontal Flip
        </label>
      </div>
    </>
  );
};

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

const exportDefault = {
  useCamData,
  CamWrapper,
  Cam,
  CamSelect,
  CamStatus,
};

export default exportDefault;
