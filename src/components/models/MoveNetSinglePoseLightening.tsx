import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../cam";
import { logger } from "../logger";
import { useLoading } from "../Loading";
import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import { COCO_ADJACENT_KEYPAIRS } from "../cocoAdjacentKeyPairs";

const MODEL_URL = "/models/movenet-singlepose-lightening/model.json";
const IMAGE_SIZE = [192, 192] as const;
const KEYPOINT_SIZE = 17;
const SCORE_THRESHOLD = 0.3;
const DOT_RADIUS = 5;
const DOT_COLOR = "red";
const LINE_WIDTH = 2;
const LINE_COLOR = "white";

export const MoveNetSinglePoseLightening = () => {
  const { setCamDataHandler, clear, flipRef } = useCamData();
  const { setLoading } = useLoading();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const predict = useCallback(
    async (model: any, camData: HTMLVideoElement) => {
      const result = tf.tidy(() => {
        const tensor = tf.browser
          .fromPixels(camData)
          .resizeNearestNeighbor([IMAGE_SIZE[0], IMAGE_SIZE[1]])
          .expandDims();
        return model.predict(tensor);
      });

      const data = await result.data();
      result.dispose();

      if (!canvasRef.current) {
        return;
      }

      canvasRef.current.width = camData.clientWidth;
      canvasRef.current.height = camData.clientHeight;

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) return;

      const keypoints: { [index: number]: [number, number] } = {};

      for (let i = 0; i < KEYPOINT_SIZE; i++) {
        const idx = i * 3;
        const score = data[idx + 2];
        if (score > SCORE_THRESHOLD) {
          const y = data[idx] * camData.clientHeight;
          const x = flipRef.current
            ? (1 - data[idx + 1]) * camData.clientWidth
            : data[idx + 1] * camData.clientWidth;
          keypoints[i] = [x, y];
        }
      }

      for (let i = 0; i < KEYPOINT_SIZE; i++) {
        if (keypoints[i]) {
          ctx.beginPath();
          ctx.arc(keypoints[i][0], keypoints[i][1], DOT_RADIUS, 0, 2 * Math.PI);
          ctx.fillStyle = DOT_COLOR;
          ctx.fill();
        }
      }

      for (const [i, j] of COCO_ADJACENT_KEYPAIRS) {
        if (keypoints[i] && keypoints[j]) {
          ctx.beginPath();
          ctx.moveTo(keypoints[i][0], keypoints[i][1]);
          ctx.lineTo(keypoints[j][0], keypoints[j][1]);
          ctx.strokeStyle = LINE_COLOR;
          ctx.lineWidth = LINE_WIDTH;
          ctx.stroke();
        }
      }
    },
    [flipRef],
  );

  useEffect(() => {
    logger("Loading Start");
    setLoading(true);
    const loadModel = loadGraphModel(MODEL_URL)
      .then((model) => {
        setCamDataHandler((camData) => predict(model, camData));
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
  }, [setCamDataHandler, clear, setLoading, predict]);

  return <canvas className="position-absolute end-0 top-0" ref={canvasRef} />;
};