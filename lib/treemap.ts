/**
 * A squarified treemap (Bruls, Huizing and van Wijk): each value gets a tile
 * whose area is its share of the whole, and rows are closed as soon as adding
 * one more tile would make the row's worst tile less square.
 *
 * Pure geometry, so it is laid out on the server beside the donut's arcs. The
 * box is not measured — it is laid out at one stated aspect and handed back in
 * percentages, so a wider panel stretches the tiles but never their areas.
 */

/** A tile's box, as percentages of the treemap it sits in. */
export type TreemapTile = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

type Box = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

type Item = { readonly index: number; readonly area: number };

const FULL_PERCENT = 100;
const EMPTY_TILE: TreemapTile = { left: 0, top: 0, width: 0, height: 0 };

function areaOf(row: readonly Item[]): number {
  return row.reduce((sum, item) => sum + item.area, 0);
}

/** The least square tile a row would hold, laid along a side of this length. */
function worstRatio(row: readonly Item[], side: number): number {
  const areas = row.map((item) => item.area);
  const sum = areaOf(row);
  const sideSquared = side * side;
  const sumSquared = sum * sum;
  return Math.max(
    (sideSquared * Math.max(...areas)) / sumSquared,
    sumSquared / (sideSquared * Math.min(...areas)),
  );
}

/** Lays a row along the box's shorter side and answers what is left of the box. */
function placeRow(
  row: readonly Item[],
  box: Box,
  place: (index: number, tile: Box) => void,
): Box {
  const sum = areaOf(row);

  if (box.w >= box.h) {
    const width = sum / box.h;
    let y = box.y;
    for (const item of row) {
      const height = item.area / width;
      place(item.index, { x: box.x, y, w: width, h: height });
      y += height;
    }
    return { x: box.x + width, y: box.y, w: box.w - width, h: box.h };
  }

  const height = sum / box.w;
  let x = box.x;
  for (const item of row) {
    const width = item.area / height;
    place(item.index, { x, y: box.y, w: width, h: height });
    x += width;
  }
  return { x: box.x, y: box.y + height, w: box.w, h: box.h - height };
}

/**
 * One tile per value, in the order the values came in. A value of zero or less
 * gets an empty tile rather than being dropped, so the answer always lines up
 * with what was asked.
 */
export function squarify(
  values: readonly number[],
  aspect: number,
): readonly TreemapTile[] {
  const tiles: TreemapTile[] = values.map(() => EMPTY_TILE);
  const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0);
  if (total <= 0) {
    return tiles;
  }

  // The box is `aspect` wide and 1 tall, so its area is `aspect`.
  const items: readonly Item[] = values
    .map((value, index) => ({ index, area: (Math.max(value, 0) / total) * aspect }))
    .filter((item) => item.area > 0)
    .sort((a, b) => b.area - a.area);

  const place = (index: number, tile: Box): void => {
    tiles[index] = {
      left: (tile.x / aspect) * FULL_PERCENT,
      top: tile.y * FULL_PERCENT,
      width: (tile.w / aspect) * FULL_PERCENT,
      height: tile.h * FULL_PERCENT,
    };
  };

  let box: Box = { x: 0, y: 0, w: aspect, h: 1 };
  let row: readonly Item[] = [];

  for (const item of items) {
    const side = Math.min(box.w, box.h);
    const grown = [...row, item];
    if (row.length === 0 || worstRatio(grown, side) <= worstRatio(row, side)) {
      row = grown;
      continue;
    }
    box = placeRow(row, box, place);
    row = [item];
  }
  if (row.length > 0) {
    placeRow(row, box, place);
  }

  return tiles;
}
