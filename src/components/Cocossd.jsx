import React, { useRef, useEffect, useCallback } from "react";
import "@tensorflow/tfjs";
import { load } from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";

export const Cocossd = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const timer = useRef(null);

  const initialize = useCallback(async () => {
    const cocossd = await load();

    const t = setInterval(() => {
      detect(cocossd);
    }, 10);
    timer.current = t;
  }, []);

  const detect = async (cocossd) => {
    if (webcamRef.current?.video?.readyState === 4 && canvasRef.current) {
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const detection = await cocossd.detect(video);

      const ctx = canvasRef.current.getContext("2d");

      detection.forEach((_detection) => {
        const [x, y, width, height] = _detection.bbox;
        const _class = _detection.class;
        const color = "red";

        ctx.strokeStyle = color;
        ctx.font = "18px Arial";
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.fillText(_class, x, y);
        ctx.rect(x, y, width, height);
        ctx.stroke();
      });
    }
  };

  useEffect(() => {
    initialize();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [initialize]);

  return (
    <div
      style={{
        position: "relative",
        width: 640,
        height: 480,
      }}
    >
      <Webcam
        ref={webcamRef}
        muted={true}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          // textAlign: "center",
          // zindex: 9,
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          // textAlign: "center",
          // zindex: 8,
        }}
      />
    </div>
  );
};
