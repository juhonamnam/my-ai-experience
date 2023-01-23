import { useRef, useEffect } from "react";
import {
  load,
  ObjectDetection as IObjectDetection,
} from "@tensorflow-models/coco-ssd";
import { useCamData } from "../Cam";
import { logger } from "../../logger";

export const ObjectDetection = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = async (model: IObjectDetection, camData: HTMLVideoElement) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    if (!ctx) return;

    canvasRef.current.width = camData.clientWidth;
    canvasRef.current.height = camData.clientHeight;
    const h_ratio = camData.clientWidth / camData.videoWidth;
    const v_ratio = camData.clientHeight / camData.videoHeight;

    const detection = await model.detect(camData);

    detection.forEach((_detection) => {
      const [x, y, width, height] = _detection.bbox;
      const _class = _detection.class;
      const color = "red";

      ctx.strokeStyle = color;
      ctx.font = "18px Arial";
      ctx.fillStyle = color;

      const _width = width * h_ratio;
      const _height = height * v_ratio;

      const _x = flipRef.current
        ? camData.clientWidth - x * h_ratio - _width
        : x * h_ratio;
      const _y = y * v_ratio;

      ctx.beginPath();
      ctx.fillText(_class, _x, _y);
      ctx.rect(_x, _y, _width, _height);
      ctx.stroke();
    });
  };

  useEffect(() => {
    const loadModel = load()
      .then((model) => {
        setCamDataProcess((camData) => detect(model, camData));
        logger("load");
        return model;
      })
      .catch((reason) => {
        alert(reason);
      });
    return () => {
      loadModel.then((model) => {
        logger("unload");
        model?.dispose();
        clear();
      });
    };
  }, []);

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
