type SSDAnchorConfig = {
  numLayers: number;
  minScale: number;
  maxScale: number;
  inputSizeHeight: number;
  inputSizeWidth: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  strides: number[];
  aspectRatios: number[];
  reduceBoxesInLowestLayer: boolean;
  interpolatedScaleAspectRatio: number;
  fixedAnchorSize: boolean;
  featureMapHeight: number[];
  featureMapWidth: number[];
};

export type SSDAnchor = {
  width: number;
  height: number;
  xCenter: number;
  yCenter: number;
};

export const getSSDAnchors = (config: SSDAnchorConfig): SSDAnchor[] => {
  const anchors = [];
  let layerId = 0;
  while (layerId < config.numLayers) {
    const anchorHeight = [];
    const anchorWidth = [];
    const aspectRatios = [];
    const scales = [];

    // For same strides, we merge the anchors in the same order.
    let lastSameStrideLayer = layerId;
    while (
      lastSameStrideLayer < config.strides.length &&
      config.strides[lastSameStrideLayer] === config.strides[layerId]
    ) {
      const scale = calculateScale(
        config.minScale,
        config.maxScale,
        lastSameStrideLayer,
        config.strides.length,
      );
      if (lastSameStrideLayer === 0 && config.reduceBoxesInLowestLayer) {
        // For first layer, it can be specified to use predefined anchors.
        aspectRatios.push(1);
        aspectRatios.push(2);
        aspectRatios.push(0.5);
        scales.push(0.1);
        scales.push(scale);
        scales.push(scale);
      } else {
        for (
          let aspectRatioId = 0;
          aspectRatioId < config.aspectRatios.length;
          ++aspectRatioId
        ) {
          aspectRatios.push(config.aspectRatios[aspectRatioId]);
          scales.push(scale);
        }
        if (config.interpolatedScaleAspectRatio > 0.0) {
          const scaleNext =
            lastSameStrideLayer === config.strides.length - 1
              ? 1.0
              : calculateScale(
                  config.minScale,
                  config.maxScale,
                  lastSameStrideLayer + 1,
                  config.strides.length,
                );
          scales.push(Math.sqrt(scale * scaleNext));
          aspectRatios.push(config.interpolatedScaleAspectRatio);
        }
      }
      lastSameStrideLayer++;
    }

    for (let i = 0; i < aspectRatios.length; ++i) {
      const ratioSqrts = Math.sqrt(aspectRatios[i]);
      anchorHeight.push(scales[i] / ratioSqrts);
      anchorWidth.push(scales[i] * ratioSqrts);
    }

    let featureMapHeight = 0;
    let featureMapWidth = 0;
    if (config.featureMapHeight.length > 0) {
      featureMapHeight = config.featureMapHeight[layerId];
      featureMapWidth = config.featureMapWidth[layerId];
    } else {
      const stride = config.strides[layerId];
      featureMapHeight = Math.ceil(config.inputSizeHeight / stride);
      featureMapWidth = Math.ceil(config.inputSizeWidth / stride);
    }

    for (let y = 0; y < featureMapHeight; ++y) {
      for (let x = 0; x < featureMapWidth; ++x) {
        for (let anchorId = 0; anchorId < anchorHeight.length; ++anchorId) {
          const xCenter = (x + config.anchorOffsetX) / featureMapWidth;
          const yCenter = (y + config.anchorOffsetY) / featureMapHeight;

          const newAnchor = {
            xCenter,
            yCenter,
            width: 0,
            height: 0,
          };

          if (config.fixedAnchorSize) {
            newAnchor.width = 1.0;
            newAnchor.height = 1.0;
          } else {
            newAnchor.width = anchorWidth[anchorId];
            newAnchor.height = anchorHeight[anchorId];
          }
          anchors.push(newAnchor);
        }
      }
    }
    layerId = lastSameStrideLayer;
  }

  return anchors;
};

const calculateScale = (
  minScale: number,
  maxScale: number,
  strideIndex: number,
  numStrides: number,
) => {
  if (numStrides === 1) {
    return (minScale + maxScale) * 0.5;
  } else {
    return minScale + ((maxScale - minScale) * strideIndex) / (numStrides - 1);
  }
};
