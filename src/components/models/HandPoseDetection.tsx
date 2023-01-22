import { useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import {
  createDetector,
  HandDetector,
  SupportedModels,
} from "@tensorflow-models/hand-pose-detection";
import { logger } from "../../logger";

export const HandPoseDetection = () => {
  const { setCamDataProcess, clear } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = async (model: HandDetector, camData: HTMLVideoElement) => {
    const detection = await model.estimateHands(camData);

    detection.forEach((hand) => {
      hand.keypoints.forEach((k) => logger(k));
    });
  };

  useEffect(() => {
    const loadModel = createDetector(SupportedModels.MediaPipeHands, {
      runtime: "tfjs",
      // solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      // modelType: "full",
    })
      .then((model) => {
        setCamDataProcess((camData) => detect(model, camData));
        logger("load");
        return model;
      })
      .catch((reason) => {
        alert(reason);
      });
    return () => {
      loadModel.then((model) => {
        logger("unload");
        model?.dispose();
        clear();
      });
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
