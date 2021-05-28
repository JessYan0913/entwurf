import { svg } from "d3-fetch";

async function fetchSvg(image) {
  const partSvg = await svg(image);
  return partSvg.documentElement;
}

const Transfer = function Transfer(_part, options) {
  this.$part = _part;
  if (typeof options === "number") {
    this.x = this.y = options;
  } else {
    if (typeof options === void 0) options = {};
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.rotate = options.rotate;
  }
};

Object.defineProperties(Transfer.prototype, {
  screenX: {
    get() {
      return this.x * this.$part.scale;
    },
  },
  screenY: {
    get() {
      return this.y * this.$part.scale;
    }
  }
});

const Part = function Part(props = {}) {
  this.name = props.name;
  this.image = `/img/${props.image}`;
  this.realWidth = props.realWidth;
  this.realHeight = props.realHeight;
  this.scale = props.scale;
  this.container = props.container;
  this.xRepeatSpaces = props.xRepeatSpaces || [0];
  this.yRepeatSpaces = props.yRepeatSpaces || [];
  this.transfer = new Transfer(this, props.transfer);
};

Part.prototype.drawingPart = function drawingPart(selection, transferX, transferY) {
  const part = this.container
    .append("g")
    .attr("transform", `translate(${transferX} ${transferY})`)
    .append(selection);
  if (!part.attr("viewBox")) {
    part.attr("viewBox", `0 0 ${part.attr("width").replace("px", "")} ${part.attr("height").replace("px", "")}`);
  }
  part
    .attr("preserveAspectRatio", "none")
    .attr("width", this.realWidth * this.scale)
    .attr("height", this.realHeight * this.scale);
};

Part.prototype.render = async function render() {
  const xPartNodes = [];
  const yPartNodes = [];
  for (let index = 0; index < this.xRepeatSpaces.length; index++) {
    const image = await fetchSvg(this.image);
    xPartNodes.push({
      space: this.xRepeatSpaces[index],
      partNode: image,
    });
  }

  for (let index = 0; index < this.yRepeatSpaces.length; index++) {
    const image = await fetchSvg(this.image);
    yPartNodes.push({
      space: this.yRepeatSpaces[index],
      partNode: image,
    });
  }

  //绘制x方向的该组件
  xPartNodes.forEach(({ space, partNode }) => {
    const transferX = (this.transfer.x + space) * this.scale;
    const transferY = this.transfer.screenY;
    this.drawingPart(() => partNode, transferX, transferY);
  });

  //绘制y方向的该组件
  yPartNodes.forEach(({ space, partNode }) => {
    const transferX = this.transfer.screenX;
    const transferY = (this.transfer.y + space) * this.scale;
    this.drawingPart(() => partNode, transferX, transferY);
  });
};

export { fetchSvg, Part };
