import {
  useRef,
  useEffect,
  PropsWithChildren,
  createContext,
  useContext,
  MutableRefObject,
  CSSProperties,
} from "react";
import Webcam from "react-webcam";

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

export const Cam = ({ style }: { style?: CSSProperties }) => {
  const ref = useRef<Webcam>(null);
  const timer = useRef<NodeJS.Timer | null>(null);
  const { camDataProcess } = useContext(CamContext);

  useEffect(() => {
    const t = setInterval(() => {
      if (ref.current?.video && camDataProcess?.current)
        camDataProcess.current(ref.current?.video);
    }, 10);
    timer.current = t;
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [camDataProcess]);

  return <Webcam mirrored ref={ref} muted style={style} />;
};

const exportDefault = { useCamData, CamWrapper, Cam };

export default exportDefault;
