import { ReactNode, useState } from "react";
import Cam from "./components/Cam";
import "bootstrap/dist/css/bootstrap.min.css";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { MobileNetV3Large } from "./components/models/MobileNetV3Large";
// import { PoseDetection } from "./components/models/PoseDetection";
// import { HandPoseDetection } from "./components/models/HandPoseDetection";
// import { BodySegmentation } from "./components/models/BodySegmentation";
// import { FaceLandmarksDetection } from "./components/models/FaceLandmarksDetection";

enum ModelType {
  None = "None",
  MobileNetV3Large = "MobileNetV3-Large",
  // PoseDetection = "Pose Detection",
  // HandPoseDetection = "Hand Pose Detection",
  // BodySegmentation = "Body Segmentation",
  // FaceLandmarksDetection = "Face Landmarks Detection",
}
const renderModel: { [key in ModelType]: ReactNode } = {
  [ModelType.None]: <></>,
  [ModelType.MobileNetV3Large]: <MobileNetV3Large />,
  // [ModelType.ObjectDetection]: <ObjectDetection />,
  // [ModelType.PoseDetection]: <PoseDetection />,
  // [ModelType.HandPoseDetection]: <HandPoseDetection />,
  // [ModelType.BodySegmentation]: <BodySegmentation />,
  // [ModelType.FaceLandmarksDetection]: <FaceLandmarksDetection />,
};

function App() {
  const [modelType, setModelType] = useState<ModelType>(ModelType.None);

  return (
    <div className="d-flex justify-content-center">
      <div>
        <label>Select Model</label>
        <select
          className="form-select"
          onChange={(e) => {
            setModelType(e.currentTarget.value as ModelType);
          }}
        >
          {Object.values(ModelType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <div style={{ position: "relative" }}>
          <Cam.CamWrapper>
            <Cam.Cam />
            {renderModel[modelType]}
          </Cam.CamWrapper>
        </div>
      </div>
    </div>
  );
}

export default App;
