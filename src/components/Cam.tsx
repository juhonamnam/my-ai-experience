import {
  useRef,
  useEffect,
  PropsWithChildren,
  createContext,
  useContext,
  MutableRefObject,
} from "react";

type CamDataProcess = (input: HTMLVideoElement) => void;
type SetCamDataProcess = (input: CamDataProcess) => void;
type ClearCamDataProcess = () => void;

const CamContext = createContext<{
  camDataProcess?: MutableRefObject<CamDataProcess | null>;
  setCamDataProcess: SetCamDataProcess;
  clear: ClearCamDataProcess;
}>({
  setCamDataProcess: () => {},
  clear: () => {},
});

export const useCamData = () => {
  const { setCamDataProcess, clear } = useContext(CamContext);
  return { setCamDataProcess, clear };
};

export const CamWrapper = ({ children }: PropsWithChildren) => {
  const camDataProcess = useRef<CamDataProcess | null>(null);
  const setCamDataProcess: SetCamDataProcess = (p) => {
    camDataProcess.current = p;
  };

  const clear: ClearCamDataProcess = () => {
    camDataProcess.current = null;
  };

  return (
    <CamContext.Provider
      value={{
        camDataProcess: camDataProcess,
        setCamDataProcess,
        clear,
      }}
    >
      {children}
    </CamContext.Provider>
  );
};

export const Cam = () => {
  const ref = useRef<HTMLVideoElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const timer = useRef<NodeJS.Timer | null>(null);
  const { camDataProcess } = useContext(CamContext);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user" },
      })
      .then((stream) => {
        ref.current!.srcObject = stream;
      });

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      devices.forEach((device) => {
        if (device.kind === "videoinput") {
          const option = document.createElement("option");
          option.value = device.deviceId;
          option.label = device.label;
          selectRef.current?.appendChild(option);
        }
      });
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (ref.current && camDataProcess?.current)
        camDataProcess.current(ref.current);
    }, 10);
    timer.current = t;
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [camDataProcess]);

  return (
    <>
      <select
        className="form-select"
        onChange={(e) => {
          navigator.mediaDevices
            .getUserMedia({
              video: { deviceId: { exact: e.currentTarget.value } },
            })
            .then((stream) => {
              ref.current!.srcObject = stream;
            });
        }}
        ref={selectRef}
      />
      <video
        autoPlay
        width="100%"
        style={{ transform: "scaleX(-1)" }}
        ref={ref}
      />
    </>
  );
};

const exportDefault = { useCamData, CamWrapper, Cam };

export default exportDefault;
