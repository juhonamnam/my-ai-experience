import { useEffect, useState } from "react";
import { useCamData } from "../Cam";
import { logger } from "../logger";
import { useLoading } from "../Loading";
import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import { IMAGENET_CLASSES } from "../imagenetClasses";

const MODEL_URL = "/models/mobilenetv3large/model.json";
const IMAGE_SIZE = [224, 224] as const;
const TOPK = 3;

export const MobileNetV3Large = () => {
  const { setCamDataProcess, clear } = useCamData();
  const { setLoading } = useLoading();
  const [predictions, setPredictions] = useState<
    {
      className: string;
      probability: number;
    }[]
  >([]);
  const predict = async (model: any, camData: HTMLVideoElement) => {
    const result = tf.tidy(() => {
      const tensor = tf.browser
        .fromPixels(camData)
        .resizeNearestNeighbor([IMAGE_SIZE[0], IMAGE_SIZE[1]])
        .toFloat()
        .expandDims();

      const result = model.predict(tensor) as tf.Tensor2D;
      return result;
    });

    const values = await result.data();

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
        setCamDataProcess((camData) => predict(model, camData));
        logger("Loading Finished");
        setLoading(false);
        return model
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
  }, [setCamDataProcess, clear, setLoading]);

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
