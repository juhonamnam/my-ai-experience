import {
  createSegmenter,
  BodySegmenter,
  SupportedModels,
  bodyPixMaskValueToRainbowColor,
} from "@tensorflow-models/body-segmentation";
import {
  drawPixelatedMask,
  toColoredMask,
} from "@tensorflow-models/body-segmentation/dist/shared/calculators/render_util";
import { useCallback, useEffect, useRef } from "react";
import { logger } from "../../logger";
import { useCamData } from "../Cam";
import { useLoading } from "../Loading";

const MODEL = SupportedModels.BodyPix;

export const BodySegmentation = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const { setLoading } = useLoading();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = useCallback(
    async (model: BodySegmenter, camData: HTMLVideoElement) => {
      if (!canvasRef.current) return;
      const segmentation = await model.segmentPeople(camData, {
        multiSegmentation: false,
        segmentBodyParts: true,
      });

      const coloredPartImage = await toColoredMask(
        segmentation,
        bodyPixMaskValueToRainbowColor,
        { r: 255, g: 255, b: 255, a: 255 }
      );

      drawPixelatedMask(
        canvasRef.current,
        camData,
        coloredPartImage,
        0.7,
        0,
        flipRef.current,
        10.0
      );
    },
    [flipRef]
  );

  useEffect(() => {
    logger("Loading Start");
    setLoading(true);
    const loadModel = createSegmenter(MODEL, {
      architecture: "MobileNetV1",
      outputStride: 16,
      multiplier: 0.5,
      quantBytes: 4,
    })
      .then((model) => {
        setCamDataProcess((camData) => detect(model, camData));
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
  }, [clear, setCamDataProcess, detect, setLoading]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
      }}
    />
  );
};
