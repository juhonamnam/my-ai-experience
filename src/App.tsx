import { useState } from "react";
import Cam from "./components/Cam";
import "bootstrap/dist/css/bootstrap.min.css";
import "@tensorflow/tfjs";
import { ImageClassification } from "./components/models/ImageClassification";
import { ObjectDetection } from "./components/models/ObjectDetection";
import { PoseDetection } from "./components/models/PoseDetection";
// import { HandDetection } from "./components/models/HandDetection";

function App() {
  const [type, setType] = useState<
    | null
    | "imageclassification"
    | "objectdetection"
    | "handdetection"
    | "posedetection"
  >(null);

  return (
    <div className="App">
      <button onClick={() => setType(null)}>Reset</button>
      <button onClick={() => setType("imageclassification")}>
        Image Classification
      </button>
      {/* <button onClick={() => setType("handdetection")}>Hand Detection</button> */}
      <button onClick={() => setType("posedetection")}>Pose Detection</button>
      <button onClick={() => setType("objectdetection")}>
        Object Detection
      </button>
      <div
        style={{
          position: "relative",
          width: 640,
          height: 480,
        }}
      >
        <Cam.CamWrapper>
          <Cam.Cam />
          {type === "imageclassification" && <ImageClassification />}
          {/* {type === "handdetector" && <HandDetector />} */}
          {type === "posedetection" && <PoseDetection />}
          {type === "objectdetection" && <ObjectDetection />}
        </Cam.CamWrapper>
      </div>
    </div>
  );
}

export default App;
