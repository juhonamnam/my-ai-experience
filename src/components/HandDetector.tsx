import { useEffect, useRef } from "react";
import { useCamData } from "./Cam";
import "@tensorflow/tfjs";
import {
  createDetector,
  HandDetector as IHandDetector,
  SupportedModels,
} from "@tensorflow-models/hand-pose-detection";

export const HandDetector = () => {
  const { setCamDataProcess, clear } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handPose = useRef<IHandDetector>();

  const detect = async (camData: HTMLVideoElement) => {
    if (!handPose.current) return;

    const detection = await handPose.current.estimateHands(camData);

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
      handPose.current = h;
    });
    setCamDataProcess((camData) => detect(camData));
    return () => clear();
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