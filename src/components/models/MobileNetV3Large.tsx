import { useEffect, useState } from "react";
import { useCamData } from "../cam";
import { logger } from "../logger";
import { useLoading } from "../Loading";
import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import { IMAGENET_CLASSES } from "../imagenetClasses";

const MODEL_URL = `${process.env.PUBLIC_URL}/models/mobilenetv3large/model.json`;
const IMAGE_SIZE = [224, 224] as const;
const TOPK = 3;

export const MobileNetV3Large = () => {
  const { setCamDataHandler, clear } = useCamData();
  const { setLoading } = useLoading();
  const [predictions, setPredictions] = useState<
    {
      className: string;
      probability: number;
    }[]
  >([]);
  const predict = async (model: tf.GraphModel, camData: HTMLVideoElement) => {
    const result = tf.tidy(() => {
      let tensor = tf.browser
        .fromPixels(camData)
        .toFloat()
        .mul(1 / 255.0)
        .expandDims() as tf.Tensor4D;

      const inputShape = [tensor.shape[1], tensor.shape[2]];
      const yResizeRatio = IMAGE_SIZE[0] / inputShape[0];
      const xResizeRatio = IMAGE_SIZE[1] / inputShape[1];

      let padding;

      if (yResizeRatio < xResizeRatio) {
        tensor = tensor.resizeNearestNeighbor([
          IMAGE_SIZE[0],
          Math.round(inputShape[1] * yResizeRatio),
        ]);
        padding = {
          y: 0,
          x: (IMAGE_SIZE[1] / tensor.shape[2] - 1) / 2,
        };
      } else {
        tensor = tensor.resizeNearestNeighbor([
          Math.round(inputShape[0] * xResizeRatio),
          IMAGE_SIZE[1],
        ]);
        padding = {
          y: (IMAGE_SIZE[0] / tensor.shape[1] - 1) / 2,
          x: 0,
        };
      }

      tensor = tf.image.transform(
        tensor,
        tf.tensor2d(
          [
            1,
            0,
            -Math.round(padding.x * IMAGE_SIZE[1]),
            0,
            1,
            -Math.round(padding.y * IMAGE_SIZE[0]),
            0,
            0,
          ],
          [1, 8],
        ),
        "nearest",
        "constant",
        0,
        [IMAGE_SIZE[0], IMAGE_SIZE[1]],
      );

      const logits1001 = model.predict(tensor) as tf.Tensor2D;

      const result = tf.slice(logits1001, [0, 1], [-1, 1000]);

      return result;
    });

    const softmax = tf.softmax(result);
    const values = await softmax.data();
    softmax.dispose();

    const valuesAndIndices = [];
    for (let i = 0; i < values.length; i++) {
      valuesAndIndices.push({ value: values[i], index: i });
    }
    valuesAndIndices.sort((a, b) => {
      return b.value - a.value;
    });
    const topkValues = new Float32Array(TOPK);
    const topkIndices = new Int32Array(TOPK);
    for (let i = 0; i < TOPK; i++) {
      topkValues[i] = valuesAndIndices[i].value;
      topkIndices[i] = valuesAndIndices[i].index;
    }

    const topClassesAndProbs = [];
    for (let i = 0; i < topkIndices.length; i++) {
      topClassesAndProbs.push({
        className: IMAGENET_CLASSES[topkIndices[i]],
        probability: topkValues[i],
      });
    }

    setPredictions(topClassesAndProbs);

    result.dispose();
  };

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
  }, [setCamDataHandler, clear, setLoading]);

  return (
    <>
      {predictions.map((p) => (
        <div key={p.className}>
          <div>{p.className}</div>
          <div className="progress">
            <div
              className="progress-bar"
              style={{ width: `${Math.min(1, p.probability) * 100}%` }}
            >
              {(p.probability * 100).toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
