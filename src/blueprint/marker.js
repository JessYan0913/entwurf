import { midpoint, linearSlope, linearDistancePoint, twoPointsDistance, slope2Angle } from "./utils/math-util";

const ArrowType = {
  //线条开始处的箭头，对应 marker-start 属性
  start: {
    id: "markerStartArrow",
    path: "M24,2 L2,5 L24,8 L20,5 Z",
    refX: 4,
    refY: 5,
  },
  //线条结束处的箭头，对应 marker-end 属性
  end: {
    id: "markerEndArrow",
    path: "M2,2 L24,5 L2,8 L6,5 Z",
    refX: 22,
    refY: 5,
  },
};

let arrowSize = 16;

/**
 * 定义箭头
 * @param {*} props
 */
function defMarkerArrow(props) {
  const { container, size = arrowSize } = props;
  arrowSize = size;
  const defs = container.append("defs");

  for (const key in ArrowType) {
    if (Object.hasOwnProperty.call(ArrowType, key)) {
      const { id, path, refX, refY } = ArrowType[key];
      defs
        .append("marker")
        .attr("id", id)
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", size * 4)
        .attr("markerHeight", size)
        .attr("viewBox", "0 0 24 24")
        .attr("refX", refX)
        .attr("refY", refY)
        .attr("orient", "auto")
        .append("path")
        .attr("d", path)
        .attr("fill", "#000");
    }
  }
}

class Marker {
  /**
   * 三视图的标记
   * @param {*} props
   */
  constructor(props = {}) {
    this.name = props.name;
    this.start = props.start || {};
    this.end = props.end || {};
    this.height = props.height || 20;
    this.scale = props.scale;
    this.container = props.container;

    //将真实的坐标转换为屏幕上的坐标
    this.startX = this.start.x * this.scale;
    this.startY = this.start.y * this.scale;
    this.endX = this.end.x * this.scale;
    this.endY = this.end.y * this.scale;

    //尺寸线高度
    this.sizeLineHeight = this.height > 0 ? this.height - 4 : this.height + 4;

    this.sizeLineGroup = this.container.append("g");
    this.textSelection = this.sizeLineGroup
      .append("text")
      .attr("font-family", "Verdana")
      .attr("startOffset", "50%")
      .attr("font-size", 12);
  }

  drawingLine(container, x1, y1, x2, y2) {
    const line = container
      .append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "black");
    return line;
  }

  drawingNormalSizeLine(startX, startY, endX, endY, slope) {
    //绘制尺寸线
    this.drawingLine(this.sizeLineGroup, startX, startY, endX, endY)
      .attr("marker-start", `url(#${ArrowType.start.id})`)
      .attr("marker-end", `url(#${ArrowType.end.id})`);

    //计算文本坐标
    const textPoint = midpoint(startX, startY, endX, endY);
    //计算尺寸线与X的夹脚
    const sizeLineAngle = slope2Angle(slope);
    //绘制尺寸文本
    this.textSelection
      .attr(
        "transform",
        `translate(${textPoint.x},${textPoint.y}) rotate(${sizeLineAngle > 0 ? sizeLineAngle + 180 : sizeLineAngle})`
      )
      .attr("text-anchor", "middle");
  }

  drawingSmallSizeLine(size1StartX, size1StartY, size2StartX, size2StartY, slope) {
    //计算尺寸线1的终点
    const size1EndPoint = linearDistancePoint(slope, size1StartX, size1StartY, -16 * 2);
    this.drawingLine(this.sizeLineGroup, size1StartX, size1StartY, size1EndPoint.x, size1EndPoint.y).attr(
      "marker-start",
      `url(#${ArrowType.start.id})`
    );

    //计算尺寸线2的终点
    const size2EndPoint = linearDistancePoint(slope, size2StartX, size2StartY, 16 * 2);
    this.drawingLine(this.sizeLineGroup, size2StartX, size2StartY, size2EndPoint.x, size2EndPoint.y).attr(
      "marker-start",
      `url(#${ArrowType.start.id})`
    );

    let textPoint = {
      x: 0,
      y: 0,
    };

    //计算尺寸线与X的夹脚
    const sizeLineAngle = slope2Angle(slope);
    if (this.position === "inner" || sizeLineAngle < 0) {
      textPoint = midpoint(size1StartX, size1StartY, size1EndPoint.x, size1EndPoint.y);
    } else {
      textPoint = midpoint(size2StartX, size2StartY, size2EndPoint.x, size2EndPoint.y);
    }

    this.textSelection.attr(
      "transform",
      `translate(${textPoint.x},${textPoint.y}) rotate(${sizeLineAngle < 0 ? sizeLineAngle + 360 : sizeLineAngle})`
    );
  }
}

class AlignMarker extends Marker {
  constructor(props) {
    super(props);

    const { start = {}, end = {}, text } = props;

    //标注文本，如果没有传入则计算标注两点间的距离
    this.text = text || twoPointsDistance(start.x, start.y, end.x, end.y).toFixed(2);

    this.textSelection.text(this.text);

    //计算尺寸线的斜率
    this.alignMarkerSlope = linearSlope(this.endX, this.endY, this.startX, this.startY);

    //标注线长度
    this.sizeLineLength = twoPointsDistance(this.startX, this.startY, this.endX, this.endY);

    this.textSelectionSize = {
      width: this.textSelection.node().getBBox().width,
      height: this.textSelection.node().getBBox().width,
    };

    //是否采用小尺寸标注，如果文本长度 + 两个箭头的长度 + 10 < 尺寸线长度，则使用正常尺寸线标记；否则使用小尺寸线标注
    this.isNormalSizeMarker = this.textSelectionSize.width + (arrowSize + 5) * 2 < this.sizeLineLength;
  }

  render() {
    //计算同一直线上和点A 相距 ±h的点
    const calculateTargetPoint = linearDistancePoint(-1 / this.alignMarkerSlope);
    //绘制尺寸界线
    const extensionLineGroup = this.container.append("g");
    //以标记起点为起始尺寸界线的起点，计算起始尺寸界线的终点
    const extensionStartPoint = calculateTargetPoint(this.startX, this.startY, this.height);
    this.drawingLine(extensionLineGroup, this.startX, this.startY, extensionStartPoint.x, extensionStartPoint.y);
    //以标记终点为终点尺寸界线的起点，计算终点尺寸界线的终点
    const extensionEndPoint = calculateTargetPoint(this.endX, this.endY, this.height);
    this.drawingLine(extensionLineGroup, this.endX, this.endY, extensionEndPoint.x, extensionEndPoint.y);

    //计算尺寸线起点
    const sizeStartPoint = calculateTargetPoint(this.startX, this.startY, this.sizeLineHeight);
    //计算尺寸线终点
    const sizeEndPoint = calculateTargetPoint(this.endX, this.endY, this.sizeLineHeight);

    if (this.isNormalSizeMarker) {
      this.drawingNormalSizeLine(
        sizeStartPoint.x,
        sizeStartPoint.y,
        sizeEndPoint.x,
        sizeEndPoint.y,
        this.alignMarkerSlope
      );
    } else {
      this.drawingSmallSizeLine(
        sizeStartPoint.x,
        sizeStartPoint.y,
        sizeEndPoint.x,
        sizeEndPoint.y,
        this.alignMarkerSlope
      );
    }
  }
}

const linearMarkerDirection = (startX, startY, endX, endY) => {
  const maxX = Math.max(startX, endX);
  const minX = Math.min(startX, endX);
  const maxY = Math.max(startY, endY);
  const minY = Math.min(startY, endY);
  return {
    x: ({ y, h }) => {
      return {
        x: h < 0 ? minX + h : maxX + h,
        y: y,
      };
    },
    y: ({ x, h }) => {
      return {
        x: x,
        y: h < 0 ? minY + h : maxY + h,
      };
    },
  };
};

class LinearMarker extends Marker {
  constructor(props) {
    super(props);
    let { direction = "x", start = {}, end = {}, text } = props;
    direction = direction.toLowerCase();
    if (direction === "y" && this.startX === this.endX) {
      throw new Error(`标记从(${this.start.x}, ${this.start.y}) 到 (${this.end.x}, ${this.end.y})无法在Y方向绘制`);
    }
    if (direction === "x" && this.startY === this.endY) {
      throw new Error(`标记从(${this.start.x}, ${this.start.y}) 到 (${this.end.x}, ${this.end.y})无法在X方向绘制`);
    }

    //计算尺寸线斜率
    this.linearMarkerSlope = direction === "y" ? 0 : Infinity;

    //标注线长度
    this.sizeLineLength = direction === "y" ? Math.abs(this.startX - this.endX) : Math.abs(this.startY - this.endY);

    //标注文本，如果没有传入则计算标注两点间的距离
    this.text =
      text || (direction === "y" ? Math.abs(start.x - end.x).toFixed(2) : Math.abs(start.y - end.y).toFixed(2));

    this.textSelection.text(this.text);

    this.textSelectionSize = {
      width: this.textSelection.node().getBBox().width,
      height: this.textSelection.node().getBBox().width,
    };

    //是否采用小尺寸标注，如果文本长度 + 两个箭头的长度 + 10 < 尺寸线长度，则使用正常尺寸线标记；否则使用小尺寸线标注
    this.isNormalSizeMarker = this.textSelectionSize.width + (arrowSize + 5) * 2 < this.sizeLineLength;

    this.direction = linearMarkerDirection(this.startX, this.startY, this.endX, this.endY)[direction];
  }

  render() {
    //绘制尺寸界线
    const extensionLineGroup = this.container.append("g");
    //从标记起点为起始尺寸界线的起点，并计算尺寸界线的终点
    const extensionStartPoint = this.direction({
      x: this.startX,
      y: this.startY,
      h: this.height,
    });
    this.drawingLine(extensionLineGroup, this.startX, this.startY, extensionStartPoint.x, extensionStartPoint.y);
    //以标记终点为终点尺寸界线的起点，计算终点尺寸界线的终点
    const extensionEndPoint = this.direction({
      x: this.endX,
      y: this.endY,
      h: this.height,
    });
    this.drawingLine(extensionLineGroup, this.endX, this.endY, extensionEndPoint.x, extensionEndPoint.y);

    //计算尺寸线起点
    const sizeStartPoint = this.direction({
      x: this.startX,
      y: this.startY,
      h: this.sizeLineHeight,
    });
    //计算尺寸线终点
    const sizeEndPoint = this.direction({
      x: this.endX,
      y: this.endY,
      h: this.sizeLineHeight,
    });

    if (this.isNormalSizeMarker) {
      this.drawingNormalSizeLine(
        sizeStartPoint.x,
        sizeStartPoint.y,
        sizeEndPoint.x,
        sizeEndPoint.y,
        this.linearMarkerSlope
      );
    } else {
      this.drawingSmallSizeLine(
        sizeStartPoint.x,
        sizeStartPoint.y,
        sizeEndPoint.x,
        sizeEndPoint.y,
        this.linearMarkerSlope
      );
    }
  }
}

export { defMarkerArrow, AlignMarker, LinearMarker };