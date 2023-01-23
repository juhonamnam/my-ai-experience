import { useEffect, useState } from "react";
import { useCamData } from "../Cam";
import { load, MobileNet } from "@tensorflow-models/mobilenet";
import { logger } from "../../logger";

export const ImageClassification = () => {
  const { setCamDataProcess, clear } = useCamData();
  const [predictions, setPredictions] = useState<
    { className: string; probability: number }[]
  >([]);

  const predict = async (model: MobileNet, camData: HTMLVideoElement) => {
    const prediction = await model.classify(camData);

    setPredictions(prediction);
  };

  useEffect(() => {
    const loadModel = load()
      .then((model) => {
        setCamDataProcess((camData) => predict(model, camData));
        logger("load");
      })
      .catch((reason) => {
        alert(reason);
      });
    return () => {
      loadModel.then(() => {
        logger("unload");
        clear();
      });
    };
  }, [setCamDataProcess, clear]);

  return (
    <>
      {predictions.map((p) => (
        <div key={p.className}>
          <div>{p.className}</div>
          <div className="progress">
            <div
              className="progress-bar"
              style={{ width: `${p.probability * 100}%` }}
            >
              {(p.probability * 100).toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
