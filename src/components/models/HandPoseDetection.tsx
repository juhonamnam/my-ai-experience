import { useCallback, useEffect, useRef } from "react";
import { useCamData } from "../Cam";
import { logger } from "../../logger";
import { HandPose, load } from "@tensorflow-models/handpose";

const FINGER_JOINTS = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20],
];

export const HandPoseDetection = () => {
  const { setCamDataProcess, clear, flipRef } = useCamData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detect = useCallback(
    async (model: HandPose, camData: HTMLVideoElement) => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");

      if (!ctx) return;

      canvasRef.current.width = camData.videoWidth;
      canvasRef.current.height = camData.videoHeight;

      const detections = await model.estimateHands(camData);

      detections.forEach((detection) => {
        FINGER_JOINTS.forEach((joint) => {
          ctx.beginPath();
          joint.forEach((idx) => {
            const x = flipRef.current
              ? camData.videoWidth - detection.landmarks[idx][0]
              : detection.landmarks[idx][0];

            const y = detection.landmarks[idx][1];

            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.lineWidth = 3;
          ctx.strokeStyle = "white";
          ctx.stroke();
        });

        detection.landmarks.forEach((landmark) => {
          const x = flipRef.current
            ? camData.videoWidth - landmark[0]
            : landmark[0];
          const y = landmark[1];
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 3 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        });
      });
    },
    [flipRef]
  );

  useEffect(() => {
    const loadModel = load()
      .then((model) => {
        setCamDataProcess((camData) => detect(model, camData));
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
  }, [setCamDataProcess, clear, detect]);

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
