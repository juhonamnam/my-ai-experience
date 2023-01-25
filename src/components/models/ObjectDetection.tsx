import { useRef, useEffect, useCallback } from "react";
import {
  load,
  ObjectDetection as IObjectDetection,
} from "@tensorflow-models/coco-ssd";
import { useCamData } from "../Cam";
import { logger } from "../../logger";
import { useLoading } from "../Loading";

export const ObjectDetection = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const { setLoading } = useLoading();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = useCallback(
    async (model: IObjectDetection, camData: HTMLVideoElement) => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) return;

      canvasRef.current.width = camData.videoWidth;
      canvasRef.current.height = camData.videoHeight;

      const detection = await model.detect(camData);

      detection.forEach((_detection) => {
        const [x, y, width, height] = _detection.bbox;
        const _class = _detection.class;
        const color = "red";

        ctx.strokeStyle = color;
        ctx.font = "18px Arial";
        ctx.fillStyle = color;

        const _width = width;
        const _height = height;

        const _x = flipRef.current ? camData.videoWidth - x - _width : x;
        const _y = y;

        ctx.beginPath();
        ctx.fillText(_class, _x, _y);
        ctx.rect(_x, _y, _width, _height);
        ctx.stroke();
      });
    },
    [flipRef]
  );

  useEffect(() => {
    logger("Loading Start");
    setLoading(true);
    const loadModel = load()
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
  }, [clear, detect, setCamDataProcess, setLoading]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        width: "100%",
        left: 0,
        right: 0,
      }}
    />
  );
};
