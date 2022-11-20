import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import { load } from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";

export const Cocossd = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const timer = useRef(null);

  const initialize = async () => {
    const cocossd = await load();

    const t = setInterval(() => {
      detect(cocossd);
    }, 1000);
    timer.current = t;
  };

  const detect = async (cocossd) => {
    if (webcamRef.current?.video?.readyState === 4 && canvasRef.current) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas height and width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const obj = await cocossd.detect(video);
      console.log(obj);

      // Draw mesh
      const ctx = canvasRef.current.getContext("2d");

      // 5. TODO - Update drawing utility
      // drawSomething(obj, ctx)
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
