class CamLocalStorage {
  storage: Storage;
  constructor() {
    this.storage = window.localStorage;
  }

  setSelectedDeviceId(deviceId: string) {
    this.storage.setItem("selectedDeviceId", deviceId);
  }

  getSelectedDeviceId() {
    return this.storage.getItem("selectedDeviceId");
  }

  setFlip(flip: boolean) {
    this.storage.setItem("flip", String(flip));
  }

  getFlip() {
    return this.storage.getItem("flip") === "true";
  }
}

export const camLocalStorage = new CamLocalStorage();
