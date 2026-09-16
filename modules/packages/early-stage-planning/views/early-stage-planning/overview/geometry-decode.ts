/**
 * 图斑 geometry 原文 → GeoJSON MultiPolygon 解码（图斑地图数据专用）
 *
 * 接口行 geometry 为库中原文字符串，实际部署中存在两种格式（按首字符嗅探）：
 *  1. 自包含 TopoJSON（modules/esp/db/tools/geojson_to_topojson.py 生成，接口文档描述的格式）：
 *     { type:'Topology', transform:{scale,translate}, objects:{feature:{type:'MultiPolygon',arcs}},
 *       arcs:[[x0,y0,dx,dy,…],…] }  // 整数量化 1e6 + 增量编码，负索引弧为反向引用
 *  2. WKT（MULTIPOLYGON (((x y, …), …), …)，共享开发库 10.13.31.235 现存格式）。
 * 另防御性兼容已是 GeoJSON 几何（MultiPolygon/Polygon 对象）的情况。
 */

/** GeoJSON MultiPolygon 几何 */
export type MultiPolygonGeometry = {
  type: 'MultiPolygon';
  coordinates: number[][][][];
};

// ---------------- TopoJSON ----------------

/** 自包含 TopoJSON 结构（后端工具生成的固定形状） */
type Topology = {
  type: 'Topology';
  transform: { scale: [number, number]; translate: [number, number] };
  objects: { feature: { type: 'MultiPolygon'; arcs: number[][][] } };
  arcs: number[][];
};

/** 增量弧 → 绝对量化点列 → 反量化经纬度点列 */
function decodeArc(delta: number[], sx: number, sy: number, tx: number, ty: number): number[][] {
  const pts: number[][] = [[delta[0], delta[1]]];
  let x = delta[0];
  let y = delta[1];
  for (let i = 2; i < delta.length; i += 2) {
    x += delta[i];
    y += delta[i + 1];
    pts.push([x, y]);
  }
  return pts.map(([qx, qy]) => [qx * sx + tx, qy * sy + ty]);
}

/** TopoJSON → MultiPolygon（等价 topojson-client 对该自包含格式的行为） */
function decodeTopology(topo: Topology): MultiPolygonGeometry {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((d) => decodeArc(d, sx, sy, tx, ty));

  const coordinates = topo.objects.feature.arcs.map((polygon) =>
    polygon.map((refs) => {
      // 弧拼接：首弧全量，后续弧去掉与上一弧重复的衔接点；负索引取反向弧
      const ring: number[][] = [];
      for (const ri of refs) {
        const a = ri >= 0 ? arcs[ri] : arcs[~ri].slice().reverse();
        if (ring.length === 0) ring.push(...a);
        else ring.push(...a.slice(1));
      }
      return closeRing(ring);
    }),
  );
  return { type: 'MultiPolygon', coordinates };
}

/** 闭合环（编码端可能已去掉闭合点，缺失时补回） */
function closeRing(ring: number[][]): number[][] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push(first.slice());
  }
  return ring;
}

// ---------------- WKT ----------------

/** WKT（MULTIPOLYGON/POLYGON）→ MultiPolygon：括号层级扫描，xy 空格分隔、逗号分隔点对；
    语义层级 polygon列表 > polygon > ring，POLYGON 比 MULTIPOLYGON 少一层括号（末尾对齐） */
function parseWkt(wkt: string): MultiPolygonGeometry {
  const head = wkt.slice(0, wkt.indexOf('(')).trim().toUpperCase();
  if (head !== 'MULTIPOLYGON' && head !== 'POLYGON') {
    throw new Error(`不支持的 WKT 类型：${head || '(空)'}`);
  }
  // 括号层级栈：栈底预置根容器；层级由外到内为 根(polygon列表) > polygon > ring > 点，
  // 各层元素深度不同（异构嵌套），用 any[][] 表达
  const stack: any[][] = [[]];
  let token = '';
  let x: number | null = null;

  const flush = () => {
    if (token === '') return;
    const v = Number.parseFloat(token);
    token = '';
    if (!Number.isFinite(v)) return;
    const ring = stack[stack.length - 1];
    if (x === null) {
      x = v;
    } else {
      ring.push([x, v]);
      x = null;
    }
  };

  for (const ch of wkt) {
    if (ch === '(') {
      flush();
      stack.push([]);
    } else if (ch === ')') {
      flush();
      const cur = stack.pop();
      if (!cur || stack.length === 0) throw new Error('WKT 括号不匹配');
      stack[stack.length - 1].push(cur);
    } else if (ch === ',' || ch === ' ') {
      flush();
    } else {
      token += ch;
    }
  }
  if (stack.length !== 1 || x !== null || token !== '') throw new Error('WKT 解析未完成');

  // 层级对齐：MULTIPOLYGON 的最外层括号与预置根容器同为「polygon 列表」层（多包了一层，取内层）；
  // POLYGON 少一层括号，根容器恰好补位为单 polygon 列表
  let polygons: number[][][][] = stack[0];
  if (head === 'MULTIPOLYGON') {
    if (polygons.length !== 1) throw new Error('MULTIPOLYGON 顶层结构异常');
    polygons = stack[0][0];
  }
  const coordinates = polygons.map((p) => p.map((r) => closeRing(r)));
  return { type: 'MultiPolygon', coordinates };
}

// ---------------- 入口 ----------------

/**
 * 解码接口行 geometry 原文为 GeoJSON MultiPolygon 几何。
 * 输入非法（无法解析 / 结构不符）时抛出，由调用方决定跳过该行。
 */
export function decodeGeometry(text: string): MultiPolygonGeometry {
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) throw new Error('geometry 为空');
  if (raw.startsWith('{')) {
    const obj = JSON.parse(raw);
    if (obj && obj.type === 'Topology') return decodeTopology(obj as Topology);
    if (obj && obj.type === 'MultiPolygon') return obj as MultiPolygonGeometry;
    if (obj && obj.type === 'Polygon') return { type: 'MultiPolygon', coordinates: [obj.coordinates] };
    throw new Error(`无法识别的 JSON 几何：${obj?.type ?? '(无 type)'}`);
  }
  return parseWkt(raw);
}
