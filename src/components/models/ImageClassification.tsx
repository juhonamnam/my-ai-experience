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
        <p key={p.className}>
          {p.className} {p.probability}
        </p>
      ))}
    </>
  );
};
