import { useEffect, useRef, useState } from "react";
import { useCamData } from "../Cam";
import { load, MobileNet } from "@tensorflow-models/mobilenet";

export const ImageClassification = () => {
  const { setCamDataProcess, clear } = useCamData();
  const mobileNet = useRef<MobileNet>();
  const [predictions, setPredictions] = useState<
    { className: string; probability: number }[]
  >([]);

  const predict = async (camData: HTMLVideoElement) => {
    if (!mobileNet.current) return;

    const prediction = await mobileNet.current.classify(camData);

    setPredictions(prediction);
  };

  useEffect(() => {
    load().then((m) => {
      mobileNet.current = m;
    });
    setCamDataProcess((camData) => predict(camData));
    return () => clear();
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
