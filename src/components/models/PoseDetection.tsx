import { useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import {
  createDetector,
  PoseDetector,
  SupportedModels,
  util,
} from "@tensorflow-models/pose-detection";
import { logger } from "../../logger";

const MODEL = SupportedModels.MoveNet;
const ADJACENT_PAIRS = util.getAdjacentPairs(MODEL);
const SCORE_THRESHOLD = 0.3;

export const PoseDetection = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = async (model: PoseDetector, camData: HTMLVideoElement) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    if (!ctx) return;

    canvasRef.current.width = camData.clientWidth;
    canvasRef.current.height = camData.clientHeight;

    const h_ratio = camData.clientWidth / camData.videoWidth;
    const v_ratio = camData.clientHeight / camData.videoHeight;

    const detection = await model.estimatePoses(camData);

    detection.forEach((_detection) => {
      ADJACENT_PAIRS.forEach((adj) => {
        const from = _detection.keypoints[adj[0]];
        const to = _detection.keypoints[adj[1]];

        if (
          !from.score ||
          from.score < SCORE_THRESHOLD ||
          !to.score ||
          to.score < SCORE_THRESHOLD
        )
          return;

        const fromX = flipRef.current
          ? camData.clientWidth - _detection.keypoints[adj[0]].x * h_ratio
          : _detection.keypoints[adj[0]].x * h_ratio;
        const fromY = _detection.keypoints[adj[0]].y * v_ratio;

        const toX = flipRef.current
          ? camData.clientWidth - _detection.keypoints[adj[1]].x * h_ratio
          : _detection.keypoints[adj[1]].x * h_ratio;
        const toY = _detection.keypoints[adj[1]].y * v_ratio;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red";
        ctx.stroke();
      });
    });
  };

  useEffect(() => {
    const loadModel = createDetector(MODEL)
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
  }, []);

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
