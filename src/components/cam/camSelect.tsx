import { useContext } from "react";
import { CamContext } from "./context";
import { camLocalStorage } from "./localStorage";

export const CamSelect = () => {
  const { devices, videoRef, flipRef } = useContext(CamContext);

  return (
    <>
      <label>Select Camera</label>
      <select
        className="form-select"
        onChange={(e) => {
          navigator.mediaDevices
            .getUserMedia({
              video: {
                deviceId: e.currentTarget.value,
              },
            })
            .then((stream) => {
              videoRef.current.srcObject = stream;
              camLocalStorage.setSelectedDeviceId(e.currentTarget.value);
            });
        }}
      >
        {devices.map((d, idx) => (
          <option key={d.value} value={d.value}>
            {idx + 1}. {d.label || "Camera"}
          </option>
        ))}
      </select>
      <div className="form-check">
        <label className="form-check-label">
          <input
            className="form-check-input"
            type="checkbox"
            defaultChecked={flipRef.current}
            onChange={(e) => {
              if (e.currentTarget.checked)
                videoRef.current.style.transform = "scaleX(-1)";
              else videoRef.current.style.transform = "";
              flipRef.current = e.currentTarget.checked;

              camLocalStorage.setFlip(e.currentTarget.checked);
            }}
          />
          Horizontal Flip
        </label>
      </div>
    </>
  );
};
