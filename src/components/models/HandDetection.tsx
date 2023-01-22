import { useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import {
  createDetector,
  HandDetector as IHandDetector,
  SupportedModels,
} from "@tensorflow-models/hand-pose-detection";

export const HandDetection = () => {
  const { setCamDataProcess, clear } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handDetector = useRef<IHandDetector>();

  const detect = async (camData: HTMLVideoElement) => {
    if (!handDetector.current) return;

    const detection = await handDetector.current.estimateHands(camData);

    detection.forEach((hand) => {
      hand.keypoints.forEach((k) => console.log(k));
    });
  };

  useEffect(() => {
    createDetector(SupportedModels.MediaPipeHands, {
      runtime: "tfjs",
      // solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      // modelType: "full",
    }).then((h) => {
      handDetector.current = h;
    });
    setCamDataProcess((camData) => detect(camData));
    return () => {
      handDetector.current?.dispose();
      clear();
    };
  }, [setCamDataProcess, clear]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
      }}
    />
  );
};
