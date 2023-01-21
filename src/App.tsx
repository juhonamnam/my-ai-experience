import "./App.css";
import Cam from "./components/Cam";
import { Cocossd } from "./components/Cocossd";

function App() {
  return (
    <div className="App">
      <div
        style={{
          position: "relative",
          width: 640,
          height: 480,
        }}
      >
        <Cam.CamWrapper>
          <Cam.Cam />
          <Cocossd />
        </Cam.CamWrapper>
      </div>
    </div>
  );
}

export default App;
