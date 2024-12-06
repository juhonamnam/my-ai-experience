import { Cam } from "./cam";
import { CamSelect } from "./camSelect";
import { CamStatus } from "./camStatus";
import { useCamData } from "./hook";
import { CamWrapper } from "./wrapper";

const exportDefault = {
  useCamData,
  CamWrapper,
  Cam,
  CamSelect,
  CamStatus,
};

export default exportDefault;

export { useCamData, CamWrapper, Cam, CamSelect, CamStatus };
