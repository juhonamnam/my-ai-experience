import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../cam";
import { logger } from "../logger";
import { useLoading } from "../Loading";
import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";

const MODEL_URL = "/models/bodypix-mobilenet-stride16/model.json";
const SEGMENT_SCORE_THRESHOLD = 0.7;
const PART_RGBS: Array<[number, number, number]> = [
  [110, 64, 170],
  [143, 61, 178],
  [178, 60, 178],
  [210, 62, 167],
  [238, 67, 149],
  [255, 78, 125],
  [255, 94, 99],
  [255, 115, 75],
  [255, 140, 56],
  [239, 167, 47],
  [217, 194, 49],
  [194, 219, 64],
  [175, 240, 91],
  [135, 245, 87],
  [96, 247, 96],
  [64, 243, 115],
  [40, 234, 141],
  [28, 219, 169],
  [26, 199, 194],
  [33, 176, 213],
  [47, 150, 224],
  [65, 125, 224],
  [84, 101, 214],
  [99, 81, 195],
];
const PART_OPACITY = 0.7;
const BACKGROUND_COLOR = "rgba(255, 255, 255, 0.7)";
const BORDER_WIDTH = 1;

export const BodyPixMobileNetStride16 = () => {
  const { setCamDataHandler, clear, flipRef } = useCamData();
  const { setLoading } = useLoading();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const predict = useCallback(
    async (model: tf.GraphModel, camData: HTMLVideoElement) => {
      const result = tf.tidy(() => {
        const tensor = tf.browser
          .fromPixels(camData)
          .toFloat()
          .div(127.5)
          .sub(1)
          .expandDims();
        const [segments, partHeatmaps] = model.execute(tensor, [
          "float_segments",
          "float_part_heatmaps",
        ]) as tf.Tensor3D[];

        return {
          segmentationScores: segments.sigmoid().squeeze(),
          segmentationParts: partHeatmaps.sigmoid().argMax(3).squeeze(),
        };
      });

      const segmentationScores =
        (await result.segmentationScores.array()) as number[][];

      const segmentationParts =
        (await result.segmentationParts.array()) as number[][];

      const [rows, columns] = result.segmentationScores.shape as [
        number,
        number,
      ];

      tf.dispose(result);

      if (!canvasRef.current) {
        return;
      }

      canvasRef.current.width = camData.clientWidth;
      canvasRef.current.height = camData.clientHeight;

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) return;

      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, camData.clientWidth, camData.clientHeight);

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
          const yMin = camData.clientHeight * (i / rows) + BORDER_WIDTH;
          const xMin =
            camData.clientWidth *
              ((flipRef.current ? columns - j - 1 : j) / columns) +
            BORDER_WIDTH;
          const height = camData.clientHeight * (1 / rows) - BORDER_WIDTH * 2;
          const width = camData.clientWidth * (1 / columns) - BORDER_WIDTH * 2;
          if (segmentationScores[i][j] > SEGMENT_SCORE_THRESHOLD) {
            const color = PART_RGBS[segmentationParts[i][j]];
            ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${PART_OPACITY})`;
            ctx.fillRect(xMin, yMin, width, height);
          }
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
