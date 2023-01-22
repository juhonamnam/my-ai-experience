import { useRef, useEffect } from "react";
import {
  load,
  ObjectDetection as IObjectDetection,
} from "@tensorflow-models/coco-ssd";
import { useCamData } from "../Cam";

export const ObjectDetection = () => {
  const { setCamDataProcess, clear } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cocossd = useRef<IObjectDetection>();

  const detect = async (camData: HTMLVideoElement) => {
    if (!cocossd.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    if (!ctx) return;

    canvasRef.current.width = camData.videoWidth;
    canvasRef.current.height = camData.videoHeight;

    const detection = await cocossd.current.detect(camData);

    detection.forEach((_detection) => {
      const [x, y, width, height] = _detection.bbox;
      const _class = _detection.class;
      const color = "red";

      ctx.strokeStyle = color;
      ctx.font = "18px Arial";
      ctx.fillStyle = color;

      const _x = camData.videoWidth - x - width;

      ctx.beginPath();
      ctx.fillText(_class, _x, y);
      ctx.rect(_x, y, width, height);
      ctx.stroke();
    });
  };

  useEffect(() => {
    load().then((c) => {
      cocossd.current = c;
    });
    setCamDataProcess((camData) => detect(camData));
    return () => {
      cocossd.current?.dispose();
      clear();
    };
  }, [clear, setCamDataProcess]);

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
