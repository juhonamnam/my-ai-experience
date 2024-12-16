import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../cam";
import { logger } from "../logger";
import { useLoading } from "../Loading";
import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import { getSSDAnchors, SSDAnchor } from "../ssdAnchors";
import { MEDIAPIPE_CONNECTED_KEYPOINTS_PAIRS } from "../mediapipeConnectedKeypointsPairs";

const DETECTION_MODEL_URL =
  "/models/mediapipe-handpose-detection-full/model.json";
const LANDMARK_MODEL_URL =
  "/models/mediapipe-handpose-landmark-full/model.json";
const DETECTION_IMAGE_SIZE = [192, 192] as const;
const DETECTION_SCORE_THRESHOLD = 0.5;
const DETECTION_BOXES = 2016;
const DETECTION_FEATURES = 18;
const DETECTION_KEYPOINTS_IN_USE = [0, 2];
const HANDS_NUM = 2;

const LANDMARK_IMAGE_SIZE = [224, 224] as const;
const LANDMARK_SCORE_THRESHOLD = 0.3;
const LANDMARK_KEYPOINT_SIZE = 21;
const RIGHT_HAND_COLOR = "red";
const LEFT_HAND_COLOR = "blue";
const LINE_WIDTH = 3;
const LINE_COLOR = "white";

const ANCHOR_CONFIGURATION = {
  reduceBoxesInLowestLayer: false,
  interpolatedScaleAspectRatio: 1.0,
  featureMapHeight: [] as number[],
  featureMapWidth: [] as number[],
  numLayers: 4,
  minScale: 0.1484375,
  maxScale: 0.75,
  inputSizeHeight: 192,
  inputSizeWidth: 192,
  anchorOffsetX: 0.5,
  anchorOffsetY: 0.5,
  strides: [8, 16, 16, 16],
  aspectRatios: [1.0],
  fixedAnchorSize: true,
};

export const MediaPipeHandPoseFull = () => {
  const { setCamDataHandler, clear, flipRef } = useCamData();
  const { setLoading } = useLoading();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const predict = useCallback(
    async (
      detectionModel: tf.GraphModel,
      landmarkModel: tf.GraphModel,
      ssdAnchors: SSDAnchor[],
      camData: HTMLVideoElement,
    ) => {
      const [tensor, scale] = tf.tidy(() => {
        let inputTensor = tf.browser
          .fromPixels(camData)
          .toFloat()
          .div(255)
          .expandDims() as tf.Tensor4D;

        const inputShape = [inputTensor.shape[1], inputTensor.shape[2]];
        const yResizeRatio = DETECTION_IMAGE_SIZE[0] / inputShape[0];
        const xResizeRatio = DETECTION_IMAGE_SIZE[1] / inputShape[1];

        let scale;

        if (yResizeRatio < xResizeRatio) {
          inputTensor = inputTensor.resizeNearestNeighbor([
            DETECTION_IMAGE_SIZE[0],
            Math.round(inputShape[1] * yResizeRatio),
          ]);
          scale = {
            y: 1,
            x: DETECTION_IMAGE_SIZE[1] / inputTensor.shape[2],
          };
        } else {
          inputTensor = inputTensor.resizeNearestNeighbor([
            Math.round(inputShape[0] * xResizeRatio),
            DETECTION_IMAGE_SIZE[1],
          ]);
          scale = {
            y: DETECTION_IMAGE_SIZE[0] / inputTensor.shape[1],
            x: 1,
          };
        }

        return [
          tf.image.transform(
            inputTensor,
            tf.tensor2d([1, 0, 0, 0, 1, 0, 0, 0], [1, 8]),
            "nearest",
            "constant",
            0,
            [DETECTION_IMAGE_SIZE[0], DETECTION_IMAGE_SIZE[1]],
          ),
          scale,
        ];
      });

      const result = tf.tidy(() => {
        const result = detectionModel.predict(tensor) as tf.Tensor3D;

        const scores = result.slice([0, 0, 0], [-1, -1, 1]).sigmoid();
        const features = result.slice([0, 0, 1], [-1, -1, -1]);

        return [scores, features];
      });

      const scores = await result[0].data();
      const data = await result[1].data();

      tf.dispose(result);

      if (!canvasRef.current) {
        tensor.dispose();
        return;
      }

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) {
        tensor.dispose();
        return;
      }

      const filteredBoxes1 = [];
      const filteredBoxes2 = [];
      const filteredScores = [];
      const filteredKeypoints = [];

      for (let i = 0; i < DETECTION_BOXES; i++) {
        const idx = i * DETECTION_FEATURES;
        const score = scores[i];
        if (score > DETECTION_SCORE_THRESHOLD) {
          const xCenter =
            (data[idx] * ssdAnchors[i].width) / DETECTION_IMAGE_SIZE[1] +
            ssdAnchors[i].xCenter;
          const yCenter =
            (data[idx + 1] * ssdAnchors[i].height) / DETECTION_IMAGE_SIZE[0] +
            ssdAnchors[i].yCenter;
          const width =
            (data[idx + 2] * ssdAnchors[i].width) / DETECTION_IMAGE_SIZE[1];
          const height =
            (data[idx + 3] * ssdAnchors[i].height) / DETECTION_IMAGE_SIZE[0];

          const xMin = xCenter - width / 2;
          const yMin = yCenter - height / 2;
          const xMax = xCenter + width / 2;
          const yMax = yCenter + height / 2;

          filteredBoxes1.push([xMin, yMin, xMax, yMax]);
          filteredBoxes2.push([xCenter, yCenter, width, height]);
          filteredScores.push(score);
          const k = [];

          for (const j of DETECTION_KEYPOINTS_IN_USE) {
            const kOffset = 4 + j * 2;
            const x =
              (data[idx + kOffset] * ssdAnchors[i].width) /
                DETECTION_IMAGE_SIZE[1] +
              ssdAnchors[i].xCenter;
            const y =
              (data[idx + kOffset + 1] * ssdAnchors[i].height) /
                DETECTION_IMAGE_SIZE[0] +
              ssdAnchors[i].yCenter;
            k.push({ x, y });
          }

          filteredKeypoints.push(k);
        }
      }

      if (filteredScores.length === 0) {
        tensor.dispose();
        canvasRef.current.width = camData.clientWidth;
        canvasRef.current.height = camData.clientHeight;
        return;
      }

      const boxesTensor = tf.tensor2d(filteredBoxes1);
      const indexesTensor = await tf.image.nonMaxSuppressionAsync(
        boxesTensor,
        filteredScores,
        HANDS_NUM,
        DETECTION_SCORE_THRESHOLD,
        DETECTION_SCORE_THRESHOLD,
      );

      boxesTensor.dispose();

      const indexes = await indexesTensor.data();

      indexesTensor.dispose();

      const handsKeypoints = [];

      for (let i = 0; i < indexes.length; i++) {
        const detectionKeypoints = filteredKeypoints[indexes[i]];

        const xCenter = filteredBoxes2[indexes[i]][0];
        const yCenter = filteredBoxes2[indexes[i]][1];
        const width = filteredBoxes2[indexes[i]][2];
        const height = filteredBoxes2[indexes[i]][3];

        const dx = 0.5 * (detectionKeypoints[1].x - detectionKeypoints[0].x);
        const dy = 0.5 * (detectionKeypoints[1].y - detectionKeypoints[0].y);

        const newXCenter = xCenter + dx;
        const newYCenter = yCenter + dy;
        const widthAndHeight = Math.max(width, height) * 2.6;

        const yMin = newYCenter - widthAndHeight / 2;
        const xMin = newXCenter - widthAndHeight / 2;
        const yMax = newYCenter + widthAndHeight / 2;
        const xMax = newXCenter + widthAndHeight / 2;

        const landmarks = tf.tidy(() => {
          const regionTensor = tf.image.cropAndResize(
            tensor,
            [[yMin, xMin, yMax, xMax]],
            [0],
            [LANDMARK_IMAGE_SIZE[0], LANDMARK_IMAGE_SIZE[1]],
          );

          return landmarkModel.execute(regionTensor, [
            "Identity_2:0",
            "Identity_1:0",
            "Identity:0",
          ]) as tf.Tensor[];
        });

        const handedness = await landmarks[2].data();
        const score = await landmarks[1].data();
        const landmarkKeypoints = await landmarks[0].data();

        tf.dispose(landmarks);

        if (score[0] > LANDMARK_SCORE_THRESHOLD) {
          const color =
            handedness[0] > 0.5 ? RIGHT_HAND_COLOR : LEFT_HAND_COLOR;

          const handKeypoints = [];

          for (let j = 0; j < LANDMARK_KEYPOINT_SIZE; j++) {
            const idx = j * 3;
            const x =
              ((landmarkKeypoints[idx] * widthAndHeight) /
                LANDMARK_IMAGE_SIZE[0] +
                xMin) *
              scale.x;
            const y =
              ((landmarkKeypoints[idx + 1] * widthAndHeight) /
                LANDMARK_IMAGE_SIZE[1] +
                yMin) *
              scale.y;

            const clientX = (flipRef.current ? 1 - x : x) * camData.clientWidth;
            const clientY = y * camData.clientHeight;

            handKeypoints.push({ clientX, clientY, color });
          }

          handsKeypoints.push(handKeypoints);
        }
      }

      tensor.dispose();

      canvasRef.current.width = camData.clientWidth;
      canvasRef.current.height = camData.clientHeight;

      for (const handKeypoints of handsKeypoints) {
        for (const [start, end] of MEDIAPIPE_CONNECTED_KEYPOINTS_PAIRS) {
          const { clientX: startX, clientY: startY } = handKeypoints[start];
          const { clientX: endX, clientY: endY } = handKeypoints[end];

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.lineWidth = LINE_WIDTH;
          ctx.strokeStyle = LINE_COLOR;
          ctx.stroke();
        }

        for (const { clientX, clientY, color } of handKeypoints) {
          ctx.beginPath();
          ctx.arc(clientX, clientY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }
    },
    [flipRef],
  );

  useEffect(() => {
    logger("Loading Start");
    setLoading(true);
    const loadModel = Promise.all([
      loadGraphModel(DETECTION_MODEL_URL),
      loadGraphModel(LANDMARK_MODEL_URL),
    ])
      .then(([detectionModel, landmarkModel]) => {
        const ssdAnchors = getSSDAnchors(ANCHOR_CONFIGURATION);
        setCamDataHandler((camData) =>
          predict(detectionModel, landmarkModel, ssdAnchors, camData),
        );
        logger("Loading Finished");
        setLoading(false);
        return [detectionModel, landmarkModel];
      })
      .catch((reason) => {
        alert(reason);
        setLoading(false);
        return [];
      });
    return () => {
      loadModel.then(([detectionModel, landmarkModel]) => {
        logger("Unloaded");
        detectionModel?.dispose();
        landmarkModel?.dispose();
        clear();
      });
    };
  }, [setCamDataHandler, clear, setLoading, predict]);

  return <canvas className="position-absolute end-0 top-0" ref={canvasRef} />;
};
