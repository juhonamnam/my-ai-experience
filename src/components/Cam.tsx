import {
  useRef,
  useEffect,
  PropsWithChildren,
  createContext,
  useContext,
  MutableRefObject,
  useState,
} from "react";

type CamDataProcess = (input: HTMLVideoElement) => void;
type SetCamDataProcess = (input: CamDataProcess) => void;
type ClearCamDataProcess = () => void;

const CamContext = createContext<{
  flipRef: MutableRefObject<boolean>;
  camDataProcessRef: MutableRefObject<CamDataProcess | null>;
  setCamDataProcess: SetCamDataProcess;
  clear: ClearCamDataProcess;
}>({
  flipRef: { current: false },
  camDataProcessRef: { current: null },
  setCamDataProcess: () => {},
  clear: () => {},
});

export const useCamData = () => {
  const { setCamDataProcess, clear, flipRef } = useContext(CamContext);
  return { setCamDataProcess, clear, flipRef };
};

export const CamWrapper = ({ children }: PropsWithChildren) => {
  const camDataProcessRef = useRef<CamDataProcess | null>(null);
  const flipRef = useRef(false);
  const setCamDataProcess: SetCamDataProcess = (p) => {
    camDataProcessRef.current = p;
  };

  const clear: ClearCamDataProcess = () => {
    camDataProcessRef.current = null;
  };

  return (
    <CamContext.Provider
      value={{
        flipRef,
        camDataProcessRef,
        setCamDataProcess,
        clear,
      }}
    >
      {children}
    </CamContext.Provider>
  );
};

export const Cam = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timer | null>(null);
  const { camDataProcessRef, flipRef } = useContext(CamContext);
  const [devices, setDevices] = useState<{ label: string; value: string }[]>(
    []
  );

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
          video: { deviceId: d[0].value },
        })
        .then((stream) => {
          videoRef.current!.srcObject = stream;
        });
      setDevices(d);
    });

    const t = setInterval(() => {
      if (videoRef.current && camDataProcessRef?.current)
        camDataProcessRef.current(videoRef.current);
    }, 10);
    timerRef.current = t;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [camDataProcessRef]);

  return (
    <>
      <label>Select Camera</label>
      <select
        className="form-select"
        onChange={(e) => {
          navigator.mediaDevices
            .getUserMedia({
              video: { deviceId: e.currentTarget.value },
            })
            .then((stream) => {
              videoRef.current!.srcObject = stream;
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
                videoRef.current!.style.transform = "scaleX(-1)";
              else videoRef.current!.style.transform = "";
              flipRef.current = e.currentTarget.checked;
            }}
          />
          Horizontal Flip
        </label>
      </div>
      <video autoPlay width="100%" ref={videoRef} />
    </>
  );
};

const exportDefault = { useCamData, CamWrapper, Cam };

export default exportDefault;