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
  predictCountRef: MutableRefObject<number>;
  videoRef: MutableRefObject<HTMLVideoElement>;
  devices: { label: string; value: string }[];
  setDevices: (devices: { label: string; value: string }[]) => void;
}>({
  flipRef: { current: false },
  camDataHandlerRef: { current: null },
  setCamDataHandler: () => {},
  clear: () => {},
  predictCountRef: { current: 0 },
  videoRef: { current: {} as HTMLVideoElement },
  devices: [],
  setDevices: () => {},
});

export const useCamData = () => {
  const { setCamDataHandler, clear, flipRef } = useContext(CamContext);
  return { setCamDataHandler, clear, flipRef };
};

export const CamWrapper = ({ children }: PropsWithChildren) => {
  const camDataHandlerRef = useRef<CamDataHandler | null>(null);
  const predictCountRef = useRef(0);
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

    let canceled = false;

    let frameId = 0;

    const handle = async () => {
      if (canceled) return;
      if (videoRef.current && camDataHandlerRef?.current) {
        await camDataHandlerRef.current(videoRef.current);
        predictCountRef.current++;
      } else {
        predictCountRef.current = 0;
      }

      frameId = requestAnimationFrame(handle);
    };
    frameId = requestAnimationFrame(handle);

    return () => {
      canceled = true;
      cancelAnimationFrame(frameId);
    };
  }, [camDataHandlerRef, predictCountRef, videoRef, setDevices]);

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
        setDevices,
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

export const CamPredictionSpeed = () => {
  const [fps, setFps] = useState(0);
  const { predictCountRef } = useContext(CamContext);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(predictCountRef.current);
      predictCountRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [predictCountRef]);

  return <div className="mt-1">Prediction Speed: {fps} FPS</div>;
};

const exportDefault = {
  useCamData,
  CamWrapper,
  Cam,
  CamSelect,
  CamPredictionSpeed,
};

export default exportDefault;
