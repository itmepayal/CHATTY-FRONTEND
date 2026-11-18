import { useMemo } from "react";

const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  GF256_EXP[i] = x;
  GF256_EXP[i + 255] = x;
  GF256_LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function polyMul(p, q) {
  const r = new Uint8Array(p.length + q.length - 1);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function polyRemainder(div, poly) {
  const r = new Uint8Array(div);
  for (let i = 0; i < div.length - poly.length + 1; i++) {
    const factor = r[i];
    if (factor !== 0) {
      for (let j = 1; j < poly.length; j++) {
        r[i + j] ^= gfMul(poly[j], factor);
      }
    }
  }
  return r.slice(div.length - poly.length + 1);
}

function getGeneratorPoly(degree) {
  let p = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    p = polyMul(p, new Uint8Array([1, GF256_EXP[i]]));
  }
  return p;
}

const ECC_TABLE = {
  1: {
    L: [26, 7, 1, 19, 0, 0],
    M: [26, 10, 1, 16, 0, 0],
    Q: [26, 13, 1, 13, 0, 0],
    H: [26, 17, 1, 9, 0, 0],
  },
  2: {
    L: [44, 10, 1, 34, 0, 0],
    M: [44, 16, 1, 28, 0, 0],
    Q: [44, 22, 1, 22, 0, 0],
    H: [44, 28, 1, 16, 0, 0],
  },
  3: {
    L: [70, 15, 1, 55, 0, 0],
    M: [70, 26, 1, 44, 0, 0],
    Q: [70, 18, 2, 17, 0, 0],
    H: [70, 22, 2, 13, 0, 0],
  },
  4: {
    L: [100, 20, 1, 80, 0, 0],
    M: [100, 18, 2, 32, 0, 0],
    Q: [100, 26, 2, 24, 0, 0],
    H: [100, 16, 4, 9, 0, 0],
  },
  5: {
    L: [134, 26, 1, 108, 0, 0],
    M: [134, 24, 2, 43, 0, 0],
    Q: [134, 18, 2, 15, 2, 16],
    H: [134, 22, 2, 11, 2, 12],
  },
  6: {
    L: [172, 18, 2, 68, 0, 0],
    M: [172, 16, 4, 27, 0, 0],
    Q: [172, 24, 4, 19, 0, 0],
    H: [172, 28, 4, 15, 0, 0],
  },
  7: {
    L: [196, 20, 2, 78, 0, 0],
    M: [196, 18, 4, 31, 0, 0],
    Q: [196, 18, 2, 14, 4, 15],
    H: [196, 26, 4, 13, 1, 14],
  },
  8: {
    L: [242, 24, 2, 97, 0, 0],
    M: [242, 22, 2, 38, 2, 39],
    Q: [242, 22, 4, 18, 2, 19],
    H: [242, 26, 4, 14, 2, 15],
  },
  9: {
    L: [292, 30, 2, 116, 0, 0],
    M: [292, 22, 3, 36, 2, 37],
    Q: [292, 20, 4, 16, 4, 17],
    H: [292, 24, 4, 12, 4, 13],
  },
  10: {
    L: [346, 18, 2, 68, 2, 69],
    M: [346, 26, 4, 43, 1, 44],
    Q: [346, 24, 6, 19, 2, 20],
    H: [346, 28, 6, 15, 2, 16],
  },
};

const ALIGNMENT_PATTERN_POSITIONS = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const FORMAT_BITS = {
  L: [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
  M: [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0],
  Q: [0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed],
  H: [0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b],
};

function generateQRMatrix(text, eccLevel = "M") {
  if (!text) return null;
  const textBytes = new TextEncoder().encode(text);

  let version = 1;
  let eccParams = null;
  let dataCapacity = 0;
  for (; version <= 10; version++) {
    eccParams = ECC_TABLE[version][eccLevel];
    const [, , b1, d1, b2, d2] = eccParams;
    dataCapacity = b1 * d1 + b2 * d2;
    const headerBits = version < 10 ? 12 : 20;
    if (textBytes.length * 8 + headerBits <= dataCapacity * 8) {
      break;
    }
  }
  if (version > 10) return null;

  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(textBytes.length, version < 10 ? 8 : 16);
  for (const b of textBytes) {
    pushBits(b, 8);
  }

  const remainingBits = dataCapacity * 8 - bits.length;
  pushBits(0, Math.min(4, remainingBits));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < dataCapacity * 8) {
    pushBits(padBytes[padIdx++ % 2], 8);
  }

  const dataBytes = new Uint8Array(dataCapacity);
  for (let i = 0; i < dataCapacity; i++) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = byteVal;
  }

  const [, ecPerBlock, numB1, dataPerB1, numB2, dataPerB2] = eccParams;
  const numBlocks = numB1 + numB2;
  const genPoly = getGeneratorPoly(ecPerBlock);

  const dataBlocks = [];
  const ecBlocks = [];
  let byteOffset = 0;

  for (let b = 0; b < numBlocks; b++) {
    const isG1 = b < numB1;
    const blockSize = isG1 ? dataPerB1 : dataPerB2;
    const blockData = dataBytes.slice(byteOffset, byteOffset + blockSize);
    byteOffset += blockSize;
    dataBlocks.push(blockData);

    const dividend = new Uint8Array(blockSize + ecPerBlock);
    dividend.set(blockData);
    const ec = polyRemainder(dividend, genPoly);
    ecBlocks.push(ec);
  }

  const finalCodewords = [];
  const maxDataLen = Math.max(dataPerB1, dataPerB2);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) {
        finalCodewords.push(dataBlocks[b][i]);
      }
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  const size = 17 + 4 * version;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  function setFunctionModule(r, c, val) {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  }

  const finderPositions = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];
  for (const [row, col] of finderPositions) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack =
              r === 0 ||
              r === 6 ||
              c === 0 ||
              c === 6 ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setFunctionModule(mr, mc, isBlack);
          } else {
            setFunctionModule(mr, mc, false);
          }
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) setFunctionModule(6, i, i % 2 === 0);
    if (matrix[i][6] === null) setFunctionModule(i, 6, i % 2 === 0);
  }

  setFunctionModule(size - 8, 8, true);

  if (ALIGNMENT_PATTERN_POSITIONS[version]) {
    const coords = ALIGNMENT_PATTERN_POSITIONS[version];
    for (const r of coords) {
      for (const c of coords) {
        if (matrix[r][c] !== null) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack =
              Math.abs(dr) === 2 ||
              Math.abs(dc) === 2 ||
              (dr === 0 && dc === 0);
            setFunctionModule(r + dr, c + dc, isBlack);
          }
        }
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) isFunction[8][i] = true;
    if (matrix[i][8] === null) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) isFunction[8][size - 1 - i] = true;
    if (matrix[size - 1 - i][8] === null) isFunction[size - 1 - i][8] = true;
  }

  let bitIdx = 0;
  const totalDataBits = finalCodewords.length * 8;
  let dir = -1;
  let c = size - 1;

  while (c > 0) {
    if (c === 6) c--;
    for (let rStep = 0; rStep < size; rStep++) {
      const r = dir === -1 ? size - 1 - rStep : rStep;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const currentC = c - colOffset;
        if (!isFunction[r][currentC]) {
          let bit = false;
          if (bitIdx < totalDataBits) {
            const byteVal = finalCodewords[Math.floor(bitIdx / 8)];
            bit = ((byteVal >> (7 - (bitIdx % 8))) & 1) === 1;
            bitIdx++;
          }
          matrix[r][currentC] = bit;
        }
      }
    }
    dir = -dir;
    c -= 2;
  }

  const chosenMask = 0;
  const maskFn = (r, col) => (r + col) % 2 === 0;

  for (let r = 0; r < size; r++) {
    for (let col = 0; col < size; col++) {
      if (!isFunction[r][col] && maskFn(r, col)) {
        matrix[r][col] = !matrix[r][col];
      }
    }
  }

  const formatCode = FORMAT_BITS[eccLevel][chosenMask];
  for (let i = 0; i < 15; i++) {
    const bit = ((formatCode >> i) & 1) === 1;
    if (i < 6) matrix[8][i] = bit;
    else if (i < 8) matrix[8][i + 1] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

export function QRCodeView({
  value,
  size = 200,
  level = "M",
  bgColor = "#ffffff",
  fgColor = "#0f172a",
  className = "",
  ariaLabel = "Link Device QR Code",
}) {
  const matrix = useMemo(() => {
    try {
      return generateQRMatrix(value, level);
    } catch {
      return null;
    }
  }, [value, level]);

  if (!matrix) {
    return (
      <div
        className={`flex items-center justify-center bg-base-200 text-xs text-base-content/50 rounded-xl ${className}`}
        style={{ width: size, height: size }}
      >
        QR unavailable
      </div>
    );
  }

  const matrixSize = matrix.length;
  const padding = 2; // quiet zone
  const totalSize = matrixSize + padding * 2;

  // Build SVG path for dark modules
  let pathD = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        pathD += `M${c + padding},${r + padding}h1v1h-1z `;
      }
    }
  }

  return (
    <div
      className={`inline-flex items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white shadow-sm border border-base-content/10 max-w-full aspect-square ${className}`}
      style={{ width: "100%", maxWidth: size + 24, height: "auto" }}
    >
      <svg
        viewBox={`0 0 ${totalSize} ${totalSize}`}
        role="img"
        aria-label={ariaLabel}
        className="shape-rendering-crispEdges select-none w-full h-full max-w-full max-h-full"
        style={{ maxWidth: size, maxHeight: size }}
      >
        <rect width={totalSize} height={totalSize} fill={bgColor} />
        <path d={pathD} fill={fgColor} />
      </svg>
    </div>
  );
}

export default QRCodeView;
