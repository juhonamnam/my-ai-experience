import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import { logger } from "../logger";
import { useLoading } from "../Loading";
import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import { OBJECT_DETECTION_CLASSES } from "../objectDetectionClasses";

const MODEL_URL = "/models/ssdlitemobilenetv2/model.json";
const IMAGE_SIZE = [224, 224] as const;
const BOX_DETECTORS = 1917;
const CLASSES = 90;
const SCORE_THRESHOLD = 0.5;
const LINE_WIDTH = 2;
const COLOR = "red";
const FONT = "18px Arial";

export const SSDLiteMobileNetV2 = () => {
  const { setCamDataHandler, clear, flipRef } = useCamData();
  const { setLoading } = useLoading();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const predict = useCallback(
    async (model: any, camData: HTMLVideoElement) => {
      const tensor = tf.tidy(() => {
        const tensor = tf.browser
          .fromPixels(camData)
          .resizeNearestNeighbor([IMAGE_SIZE[0], IMAGE_SIZE[1]])
          .expandDims();
        return tensor;
      });

      const result = await model.predictAsync(tensor);
      tensor.dispose();

      const scores = (await result[0].data()) as Float32Array;
      const boxes = (await result[1].data()) as Float32Array;

      tf.dispose(result);

      if (!canvasRef.current) {
        return;
      }

      canvasRef.current.width = camData.clientWidth;
      canvasRef.current.height = camData.clientHeight;

      const ctx = canvasRef.current.getContext("2d");

      const filtered_boxes: number[] = [];
      const filtered_classes = [];
      const filtered_scores: number[] = [];

      for (let i = 0; i < BOX_DETECTORS; i++) {
        const idxStart = i * CLASSES;

        let maxScore = scores[idxStart];
        let maxScoreIndex = 0;

        for (let j = 1; j < CLASSES; j++) {
          const idx = idxStart + j;
          if (scores[idx] > maxScore) {
            maxScore = scores[idx];
            maxScoreIndex = j;
          }
        }

        if (maxScore > SCORE_THRESHOLD) {
          filtered_boxes.push(
            boxes[i * 4],
            boxes[i * 4 + 1],
            boxes[i * 4 + 2],
            boxes[i * 4 + 3],
          );
          filtered_classes.push(maxScoreIndex);
          filtered_scores.push(maxScore);
        }
      }

      const boxesTensor = tf.tensor2d(filtered_boxes, [
        filtered_boxes.length / 4,
        4,
      ]);
      const indexesTensor = await tf.image.nonMaxSuppressionAsync(
        boxesTensor,
        filtered_scores,
        10,
        SCORE_THRESHOLD,
        SCORE_THRESHOLD,
      );

      boxesTensor.dispose();

      const indexes = await indexesTensor.data();

      indexesTensor.dispose();

      for (let i = 0; i < indexes.length; i++) {
        const yMin = filtered_boxes[indexes[i] * 4] * camData.clientHeight;
        const xMin =
          (flipRef.current
            ? 1 - filtered_boxes[indexes[i] * 4 + 3]
            : filtered_boxes[indexes[i] * 4 + 1]) * camData.clientWidth;
        const yMax = filtered_boxes[indexes[i] * 4 + 2] * camData.clientHeight;
        const xMax =
          (flipRef.current
            ? 1 - filtered_boxes[indexes[i] * 4 + 1]
            : filtered_boxes[indexes[i] * 4 + 3]) * camData.clientWidth;

        const classIndex = filtered_classes[indexes[i]] + 1;

        if (ctx) {
          ctx.beginPath();
          ctx.rect(xMin, yMin, xMax - xMin, yMax - yMin);
          ctx.lineWidth = LINE_WIDTH;
          ctx.strokeStyle = COLOR;
          ctx.fillStyle = COLOR;
          ctx.stroke();
          ctx.font = FONT;
          ctx.fillText(OBJECT_DETECTION_CLASSES[classIndex], xMin, yMin);
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
