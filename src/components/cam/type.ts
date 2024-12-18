export type CamDataHandler = (input: HTMLVideoElement) => Promise<void>;
export type SetCamDataHandler = (cameraHandler: CamDataHandler) => void;
export type Clear = () => void;
