import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { CamContext } from "./context";
import { camLocalStorage } from "./localStorage";

const EMPTY_DEVICE = { label: "Not Selected", value: "" };

export const CamSelect = () => {
  const { videoRef, flipRef } = useContext(CamContext);
  const [devices, setDevices] = useState<{ label: string; value: string }[]>([
    EMPTY_DEVICE,
  ]);

  const selectedDeviceRef = useRef<string>(
    camLocalStorage.getSelectedDeviceId() || "",
  );
  const [selectedDevice, _setSelectedDevice] = useState<string>(
    camLocalStorage.getSelectedDeviceId() || "",
  );

  const setSelectedDevice = async (deviceId: string) => {
    selectedDeviceRef.current = deviceId;
    _setSelectedDevice(deviceId);
    camLocalStorage.setSelectedDeviceId(deviceId);
  };

  const refreshDevices = useCallback(async (isFirst = false) => {
    await navigator.mediaDevices.getUserMedia({ video: true });
    const d: { label: string; value: string }[] = [EMPTY_DEVICE];

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      devices.forEach((device) => {
        if (device.kind === "videoinput") {
          d.push({ value: device.deviceId, label: device.label });
        }
      });

      setDevices(d);

      if (
        (isFirst && !selectedDeviceRef.current) ||
        !d.some((device) => device.value === selectedDeviceRef.current)
      ) {
        if (d.length > 1) setSelectedDevice(d[1].value);
        else setSelectedDevice("");
      }
    } catch (e) {
      alert(e);
      setDevices(d);
    }
  }, []);

  useEffect(() => {
    refreshDevices(true);
  }, [refreshDevices]);

  useEffect(() => {
    (async () => {
      try {
        if (selectedDevice) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: selectedDevice },
            },
          });

          videoRef.current.srcObject = stream;
        } else {
          videoRef.current.srcObject = null;
        }
      } catch (e) {
        videoRef.current.srcObject = null;
      }
    })();
  }, [selectedDevice, videoRef]);

  useEffect(() => {
    if (flipRef.current) {
      videoRef.current.style.transform = "scaleX(-1)";
    }
  }, [flipRef, videoRef]);

  return (
    <>
      <div className="d-flex align-items-center">
        Select Camera
        <button
          className="btn bi bi-arrow-clockwise"
          onClick={() => refreshDevices()}
        ></button>
      </div>
      <select
        className="form-select"
        onChange={(e) => {
          setSelectedDevice(e.currentTarget.value);
        }}
        value={selectedDevice}
      >
        {devices.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
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
