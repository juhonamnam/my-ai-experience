import { useState } from "react";
import Cam from "./components/cam";
import "bootstrap/dist/css/bootstrap.min.css";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { MobileNetV1 } from "./components/models/MobileNetV1";
import { MobileNetV2 } from "./components/models/MobileNetV2";
import { MobileNetV3Large } from "./components/models/MobileNetV3Large";
import { MobileNetV3Small } from "./components/models/MobileNetV3Small";
import { SSDLiteMobileNetV2 } from "./components/models/SSDLiteMobileNetV2";
import { MoveNetSinglePoseLightening } from "./components/models/MoveNetSinglePoseLightening";
import { MediaPipeHandPoseFull } from "./components/models/MediaPipeHandPoseFull";
import { BodyPixMobileNetStride16 } from "./components/models/BodyPixMobileNetStride16";
import { MediaPipeFaceMesh } from "./components/models/MediaPipeFaceMesh";

const MODELS = {
  None: <></>,
  MobileNetV1: <MobileNetV1 />,
  MobileNetV2: <MobileNetV2 />,
  "MobileNetV3-Large": <MobileNetV3Large />,
  "MobileNetV3-Small": <MobileNetV3Small />,
  SSDLite: <SSDLiteMobileNetV2 />,
  MoveNet: <MoveNetSinglePoseLightening />,
  BodyPix: <BodyPixMobileNetStride16 />,
  "MediaPipe-HandPose": <MediaPipeHandPoseFull />,
  "MediaPipe-FaceMesh": <MediaPipeFaceMesh />,
};

function App() {
  const [selectedModel, setSelectedModel] =
    useState<keyof typeof MODELS>("None");

  return (
    <div className="d-flex justify-content-center container">
      <Cam.CamWrapper>
        <div>
          <label>Select Model</label>
          <select
            className="form-select"
            onChange={(e) => {
              setSelectedModel(e.currentTarget.value as keyof typeof MODELS);
            }}
          >
            {Object.keys(MODELS).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Cam.CamSelect />
          <div className="position-relative">
            <Cam.Cam />
            {MODELS[selectedModel]}
          </div>
          <Cam.CamStatus />
        </div>
      </Cam.CamWrapper>
    </div>
  );
}

export default App;
