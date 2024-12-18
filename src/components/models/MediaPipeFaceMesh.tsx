import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../cam";
import { logger } from "../logger";
import { useLoading } from "../Loading";
import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import { getSSDAnchors, SSDAnchor } from "../ssdAnchors";
import { MEDIAPIPE_FACE_MESH_CONNECTED_KEYPOINTS_PAIRS } from "../mediapipeFaceMeshConnectedKeypointsPairs";

const DETECTION_MODEL_URL =
  `${process.env.PUBLIC_URL}/models/mediapipe-face-detection-short/model.json`;
const DETECTION_IMAGE_SIZE = [128, 128] as const;
const DETECTION_BOXES = 896;
const DETECTION_FEATURES = 16;
const DETECTION_SCORE_THRESHOLD = 0.5;
const DETECTION_KEYPOINTS_IN_USE = [0, 1];
const FACES_NUM = 1;

const LANDMARK_MODEL_URL =
  `${process.env.PUBLIC_URL}/models/mediapipe-face-landmark-detection/model.json`;
const LANDMARK_IMAGE_SIZE = [192, 192];
const LANDMARK_KEYPOINTS = 468;
const LINE_WIDTH = 1;
const LINE_COLOR = "pink";

const ANCHOR_CONFIGURATION = {
  reduceBoxesInLowestLayer: false,
  interpolatedScaleAspectRatio: 1.0,
  featureMapHeight: [] as number[],
  featureMapWidth: [] as number[],
  numLayers: 4,
  minScale: 0.1484375,
  maxScale: 0.75,
  inputSizeHeight: 128,
  inputSizeWidth: 128,
  anchorOffsetX: 0.5,
  anchorOffsetY: 0.5,
  strides: [8, 16, 16, 16],
  aspectRatios: [1.0],
  fixedAnchorSize: true,
};

export const MediaPipeFaceMesh = () => {
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
      const [tensor, scale, padding] = tf.tidy(() => {
        let inputTensor = tf.browser
          .fromPixels(camData)
          .toFloat()
          .expandDims() as tf.Tensor4D;

        const inputShape = [inputTensor.shape[1], inputTensor.shape[2]];
        const yResizeRatio = DETECTION_IMAGE_SIZE[0] / inputShape[0];
        const xResizeRatio = DETECTION_IMAGE_SIZE[1] / inputShape[1];

        let scale;
        let padding;

        if (yResizeRatio < xResizeRatio) {
          inputTensor = inputTensor.resizeNearestNeighbor([
            DETECTION_IMAGE_SIZE[0],
            Math.round(inputShape[1] * yResizeRatio),
          ]);
          scale = {
            y: 1,
            x: DETECTION_IMAGE_SIZE[1] / inputTensor.shape[2],
          };
          padding = {
            y: 0,
            x: (scale.x - 1) / 2,
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
          padding = {
            y: (scale.y - 1) / 2,
            x: 0,
          };
        }

        return [
          tf.image.transform(
            inputTensor,
            tf.tensor2d(
              [
                1,
                0,
                -Math.round(padding.x * DETECTION_IMAGE_SIZE[1]),
                0,
                1,
                -Math.round(padding.y * DETECTION_IMAGE_SIZE[0]),
                0,
                0,
              ],
              [1, 8],
            ),
            "nearest",
            "constant",
            0,
            [DETECTION_IMAGE_SIZE[0], DETECTION_IMAGE_SIZE[1]],
          ),
          scale,
          padding,
        ];
      });

      const result = tf.tidy(() => {
        const result = detectionModel.execute(
          tensor.div(127.5).sub(1),
        ) as tf.Tensor3D;

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
        FACES_NUM,
        DETECTION_SCORE_THRESHOLD,
        DETECTION_SCORE_THRESHOLD,
      );

      boxesTensor.dispose();

      const indexes = await indexesTensor.data();

      indexesTensor.dispose();

      const facesKeypoints = [];

      for (let i = 0; i < indexes.length; i++) {
        const detectionKeypoints = filteredKeypoints[indexes[i]];

        const rotation = -Math.atan2(
          detectionKeypoints[0].y - detectionKeypoints[1].y,
          detectionKeypoints[1].x - detectionKeypoints[0].x,
        );

        const xCenter = filteredBoxes2[indexes[i]][0];
        const yCenter = filteredBoxes2[indexes[i]][1];
        const width = filteredBoxes2[indexes[i]][2];
        const height = filteredBoxes2[indexes[i]][3];

        const widthAndHeight = Math.max(width, height) * 2;

        const yMin = yCenter - widthAndHeight / 2;
        const xMin = xCenter - widthAndHeight / 2;
        const yMax = yCenter + widthAndHeight / 2;
        const xMax = xCenter + widthAndHeight / 2;

        const landmarks = tf.tidy(() => {
          let regionTensor = tf.image
            .cropAndResize(
              tensor,
              [[yMin, xMin, yMax, xMax]],
              [0],
              [LANDMARK_IMAGE_SIZE[0], LANDMARK_IMAGE_SIZE[1]],
            )
            .div(127.5)
            .sub(1) as tf.Tensor4D;

          regionTensor = tf.image.rotateWithOffset(regionTensor, rotation);

          return landmarkModel.execute(regionTensor, [
            "output_mesh",
          ]) as tf.Tensor3D;
        });

        const landmarkKeypoints = await landmarks.data();

        landmarks.dispose();

        const faceKeypoints = [];

        for (let j = 0; j < LANDMARK_KEYPOINTS; j++) {
          const idx = j * 3;
          const x =
            (landmarkKeypoints[idx] * widthAndHeight) / LANDMARK_IMAGE_SIZE[1] +
            xMin;
          const y =
            (landmarkKeypoints[idx + 1] * widthAndHeight) /
              LANDMARK_IMAGE_SIZE[0] +
            yMin;

          const rotatedX =
            xCenter +
            (x - xCenter) * Math.cos(rotation) -
            (y - yCenter) * Math.sin(rotation);
          const rotatedY =
            yCenter +
            (y - yCenter) * Math.cos(rotation) +
            (x - xCenter) * Math.sin(rotation);

          const restoredX = (rotatedX - padding.x) * scale.x;
          const restoredY = (rotatedY - padding.y) * scale.y;

          const clientX =
            (flipRef.current ? 1 - restoredX : restoredX) * camData.clientWidth;
          const clientY = restoredY * camData.clientHeight;

          faceKeypoints.push({ clientX, clientY, xMin, yMin, widthAndHeight });
        }

        facesKeypoints.push(faceKeypoints);
      }

      tensor.dispose();

      canvasRef.current.width = camData.clientWidth;
      canvasRef.current.height = camData.clientHeight;

      for (const faceKeypoints of facesKeypoints) {
        for (const [
          start,
          end,
        ] of MEDIAPIPE_FACE_MESH_CONNECTED_KEYPOINTS_PAIRS) {
          const { clientX: startX, clientY: startY } = faceKeypoints[start];
          const { clientX: endX, clientY: endY } = faceKeypoints[end];

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.lineWidth = LINE_WIDTH;
          ctx.strokeStyle = LINE_COLOR;
          ctx.stroke();
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
