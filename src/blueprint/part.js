import { svg } from "d3-fetch";

async function fetchSvg(image) {
  const partSvg = await svg(image);
  return partSvg.documentElement;
}

class Part {
  constructor(props = {}) {
    this.name = props.name;
    this.image = `/img/${props.image}`;
    this.realWidth = props.realWidth;
    this.realHeight = props.realHeight;
    this.scale = props.scale;
    this.container = props.container;
    this.xRepeatSpaces = props.xRepeatSpaces || [0];
    this.yRepeatSpaces = props.yRepeatSpaces || [];
    this.transferX = props.transfer.x;
    this.transferY = props.transfer.y;
  }

  drawingPart(selection, transferX, transferY) {
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
  }

  async render() {
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
      const transferX = (this.transferX + space) * this.scale;
      const transferY = this.transferY * this.scale;
      this.drawingPart(() => partNode, transferX, transferY);
    });

    //绘制y方向的该组件
    yPartNodes.forEach(({ space, partNode }) => {
      const transferX = this.transferX * this.scale;
      const transferY = (this.transferY + space) * this.scale;
      this.drawingPart(() => partNode, transferX, transferY);
    });
  }
}

export { fetchSvg, Part };