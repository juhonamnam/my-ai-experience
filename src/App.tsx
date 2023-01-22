import { useState } from "react";
import "./App.css";
import Cam from "./components/Cam";
import { Cocossd } from "./components/Cocossd";
// import { HandDetector } from "./components/HandDetector";
import { MobileNet } from "./components/MobileNet";

function App() {
  const [type, setType] = useState<
    null | "mobilenet" | "cocossd" | "handdetector"
  >(null);

  return (
    <div className="App">
      <button onClick={() => setType(null)}>Reset</button>
      <button onClick={() => setType("mobilenet")}>MobileNet</button>
      {/* <button onClick={() => setType("handdetector")}>Hand Detector</button> */}
      <button onClick={() => setType("cocossd")}>Coco SSD</button>
      <div
        style={{
          position: "relative",
          width: 640,
          height: 480,
        }}
      >
        <Cam.CamWrapper>
          <Cam.Cam />
          {type === "mobilenet" && <MobileNet />}
          {/* {type === "handdetector" && <HandDetector />} */}
          {type === "cocossd" && <Cocossd />}
        </Cam.CamWrapper>
      </div>
    </div>
  );
}

export default App;
