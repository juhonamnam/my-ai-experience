import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import { logger } from "../../logger";
import {
  createDetector,
  SupportedModels,
  HandDetector,
} from "@tensorflow-models/hand-pose-detection";

const MODEL = SupportedModels.MediaPipeHands;

const FINGER_JOINTS = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20],
];

export const HandPoseDetection = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = useCallback(
    async (model: HandDetector, camData: HTMLVideoElement) => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) return;

      canvasRef.current.width = camData.videoWidth;
      canvasRef.current.height = camData.videoHeight;

      const detections = await model.estimateHands(camData);

      console.log(detections);

      detections.forEach((detection) => {
        FINGER_JOINTS.forEach((joint) => {
          ctx.beginPath();
          joint.forEach((idx) => {
            const x = flipRef.current
              ? camData.videoWidth - detection.keypoints[idx].x
              : detection.keypoints[idx].x;

            const y = detection.keypoints[idx].y;

            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.lineWidth = 3;
          ctx.strokeStyle = "white";
          ctx.stroke();
        });

        const color = detection.handedness === "Left" ? "blue" : "red";

        detection.keypoints.forEach((keypoint) => {
          const x = flipRef.current
            ? camData.videoWidth - keypoint.x
            : keypoint.x;
          const y = keypoint.y;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 3 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        });
      });
    },
    [flipRef]
  );

  useEffect(() => {
    const loadModel = createDetector(MODEL, {
      runtime: "mediapipe",
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      modelType: "full",
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
  }, [setCamDataProcess, clear, detect]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        width: "100%",
        left: 0,
        right: 0,
      }}
    />
  );
};
