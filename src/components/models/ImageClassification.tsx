import { useEffect, useState } from "react";
import { useCamData } from "../Cam";
import { load, MobileNet } from "@tensorflow-models/mobilenet";
import { logger } from "../../logger";
import { useLoading } from "../Loading";

export const ImageClassification = () => {
  const { setCamDataProcess, clear } = useCamData();
  const { setLoading } = useLoading();
  const [predictions, setPredictions] = useState<
    { className: string; probability: number }[]
  >([]);

  const predict = async (model: MobileNet, camData: HTMLVideoElement) => {
    const prediction = await model.classify(camData);

    setPredictions(prediction);
  };

  useEffect(() => {
    logger("Loading Start");
    setLoading(true);
    const loadModel = load()
      .then((model) => {
        setCamDataProcess((camData) => predict(model, camData));
        logger("Load Finished");
        setLoading(false);
      })
      .catch((reason) => {
        alert(reason);
        setLoading(false);
      });
    return () => {
      loadModel.then(() => {
        logger("Unloaded");
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
