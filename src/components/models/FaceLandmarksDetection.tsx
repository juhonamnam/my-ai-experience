import {
  createDetector,
  SupportedModels,
  FaceLandmarksDetector,
  util,
} from "@tensorflow-models/face-landmarks-detection";
import { useCallback, useEffect, useRef } from "react";
import { logger } from "../../logger";
import { useCamData } from "../Cam";

const MODEL = SupportedModels.MediaPipeFaceMesh;
const ADJACENT_PAIRS = util.getAdjacentPairs(MODEL);

export const FaceLandmarksDetection = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = useCallback(
    async (model: FaceLandmarksDetector, camData: HTMLVideoElement) => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) return;

      canvasRef.current.width = camData.videoWidth;
      canvasRef.current.height = camData.videoHeight;

      const detections = await model.estimateFaces(camData);

      detections.forEach((detection) => {
        ADJACENT_PAIRS.forEach((adj) => {
          const from = detection.keypoints[adj[0]];
          const to = detection.keypoints[adj[1]];

          const fromX = flipRef.current ? camData.videoWidth - from.x : from.x;
          const fromY = from.y;

          const toX = flipRef.current ? camData.videoWidth - to.x : to.x;
          const toY = to.y;

          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.strokeStyle = "pink";
          ctx.stroke();
        });
      });
    },
    [flipRef]
  );

  useEffect(() => {
    const loadModel = createDetector(MODEL, {
      runtime: "mediapipe",
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
      refineLandmarks: false,
    })
      .then((model) => {
        logger("load");
        setCamDataProcess((camData) => detect(model, camData));
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
  }, [clear, setCamDataProcess, detect]);

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
