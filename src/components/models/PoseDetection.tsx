import { useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import {
  createDetector,
  PoseDetector,
  SupportedModels,
  util,
} from "@tensorflow-models/pose-detection";

const MODEL = SupportedModels.MoveNet;
const ADJACENT_PAIRS = util.getAdjacentPairs(MODEL);
const SCORE_THRESHOLD = 0.3;

export const PoseDetection = () => {
  const { setCamDataProcess, clear } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseDetection = useRef<PoseDetector>();

  const detect = async (camData: HTMLVideoElement) => {
    if (!poseDetection.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    if (!ctx) return;

    canvasRef.current.width = camData.videoWidth;
    canvasRef.current.height = camData.videoHeight;

    const detection = await poseDetection.current.estimatePoses(camData);

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

        ctx.beginPath();
        ctx.moveTo(
          camData.videoWidth - _detection.keypoints[adj[0]].x,
          _detection.keypoints[adj[0]].y
        );
        ctx.lineTo(
          camData.videoWidth - _detection.keypoints[adj[1]].x,
          _detection.keypoints[adj[1]].y
        );
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red";
        ctx.stroke();
      });
    });
  };

  useEffect(() => {
    createDetector(MODEL).then((p) => {
      poseDetection.current = p;
    });
    setCamDataProcess((camData) => detect(camData));
    return () => {
      poseDetection.current?.dispose();
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
