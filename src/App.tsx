import { ReactNode, useState } from "react";
import Cam from "./components/Cam";
import "bootstrap/dist/css/bootstrap.min.css";
import "@tensorflow/tfjs";
import { ImageClassification } from "./components/models/ImageClassification";
import { ObjectDetection } from "./components/models/ObjectDetection";
import { PoseDetection } from "./components/models/PoseDetection";
// import { HandDetection } from "./components/models/HandDetection";

enum ModelType {
  None = "None",
  ImageClassification = "Image Classification",
  PoseDetection = "Pose Detection",
  ObjectDetection = "Object Detection",
}
const renderModel: { [key in ModelType]: ReactNode } = {
  [ModelType.None]: <></>,
  [ModelType.ImageClassification]: <ImageClassification />,
  [ModelType.PoseDetection]: <PoseDetection />,
  [ModelType.ObjectDetection]: <ObjectDetection />,
};

function App() {
  const [modelType, setModelType] = useState<ModelType>(ModelType.None);

  return (
    <div className="d-flex justify-content-center">
      <div>
        <select
          className="form-select"
          onChange={(e) => {
            setModelType(e.currentTarget.value as ModelType);
          }}
        >
          {Object.values(ModelType).map((type) => (
            <option value={type}>{type}</option>
          ))}
        </select>
        <div
          style={{
            position: "relative",
            width: 640,
            height: 480,
          }}
        >
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
