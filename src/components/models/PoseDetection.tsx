import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import {
  createDetector,
  PoseDetector,
  SupportedModels,
  util,
} from "@tensorflow-models/pose-detection";
import { logger } from "../../logger";
import { useLoading } from "../Loading";

const MODEL = SupportedModels.MoveNet;
const ADJACENT_PAIRS = util.getAdjacentPairs(MODEL);
const SCORE_THRESHOLD = 0.3;

export const PoseDetection = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const { setLoading } = useLoading();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = useCallback(
    async (model: PoseDetector, camData: HTMLVideoElement) => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) return;

      canvasRef.current.width = camData.videoWidth;
      canvasRef.current.height = camData.videoHeight;

      const detections = await model.estimatePoses(camData);

      detections.forEach((detection) => {
        ADJACENT_PAIRS.forEach((adj) => {
          const from = detection.keypoints[adj[0]];
          const to = detection.keypoints[adj[1]];

          if (
            !from.score ||
            from.score < SCORE_THRESHOLD ||
            !to.score ||
            to.score < SCORE_THRESHOLD
          )
            return;

          const fromX = flipRef.current ? camData.videoWidth - from.x : from.x;
          const fromY = from.y;

          const toX = flipRef.current ? camData.videoWidth - to.x : to.x;
          const toY = detection.keypoints[adj[1]].y;

          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.lineWidth = 3;
          ctx.strokeStyle = "white";
          ctx.stroke();
        });

        detection.keypoints.forEach((keypoint) => {
          if (!keypoint.score || keypoint.score < SCORE_THRESHOLD) return;
          const x = flipRef.current
            ? camData.videoWidth - keypoint.x
            : keypoint.x;
          const y = keypoint.y;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 3 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        });
      });
    },
    [flipRef]
  );

  useEffect(() => {
    logger("Loading Start");
    setLoading(true);
    const loadModel = createDetector(MODEL)
      .then((model) => {
        setCamDataProcess((camData) => detect(model, camData));
        logger("Loading Finished");
        setLoading(false);
        return model;
      })
      .catch((reason) => {
        alert(reason);
        setLoading(false);
      });
    return () => {
      loadModel.then((model) => {
        logger("Unloaded");
        model?.dispose();
        clear();
      });
    };
  }, [clear, detect, setCamDataProcess, setLoading]);

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
