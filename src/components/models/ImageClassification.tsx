import { useEffect, useState } from "react";
import { useCamData } from "../Cam";
import { load, MobileNet } from "@tensorflow-models/mobilenet";
import { logger } from "../../logger";
import { useLoading } from "../Loading";

export const ImageClassification = () => {
  const { setCamDataProcess, clear } = useCamData();
  const { setLoading } = useLoading();
  const [result, setResult] = useState<{
    predictions: { className: string; probability: number }[];
    width: number;
  }>({ predictions: [], width: 0 });

  const predict = async (model: MobileNet, camData: HTMLVideoElement) => {
    const predictions = await model.classify(camData);

    setResult({ predictions, width: camData.videoWidth });
  };

  useEffect(() => {
    logger("Loading Start");
    setLoading(true);
    const loadModel = load()
      .then((model) => {
        setCamDataProcess((camData) => predict(model, camData));
        logger("Loading Finished");
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
      {result.predictions.map((p) => (
        <div key={p.className} style={{ width: result.width }}>
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
