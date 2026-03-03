// 棋盘形状预设配置（仅标准方形）
const BoardShapes = {
    square_19x19: { type: 'square', size: 19 },
    square_21x21_center_hole: {
        type: 'square',
        size: 21,
        holes: generateCenterHoles(21, 9)
    }
};

// 生成中心挖孔配置
function generateCenterHoles(boardSize, holeSize) {
    const holes = [];
    const offset = Math.floor((boardSize - holeSize) / 2);

    for (let y = offset; y < offset + holeSize; y++) {
        for (let x = offset; x < offset + holeSize; x++) {
            holes.push({ x, y });
        }
    }

    return holes;
}

// 创建自定义方形棋盘配置
function createCustomSquare(size) {
    return {
        type: 'square',
        size: size,
        isCustom: true
    };
}

// 生成随机挖孔配置（支持追加模式）
// density: 0-100，表示挖孔的密度百分比
// append: true表示追加到现有holes，false表示替换
function generateRandomHoles(config, density, append = false) {
    if (density <= 0) return config;

    const { type, size } = config;
    let positions = [];
    const existingHoles = config.holes || [];
    const existingHoleSet = new Set(existingHoles.map(h => `${h.x},${h.y}`));

    // 只支持方形棋盘
    if (type === 'square') {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // 避开边角（保留棋盘完整性）
                if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
                    const key = `${x},${y}`;
                    // 避开已有的孔（追加模式）
                    if (!existingHoleSet.has(key)) {
                        positions.push({ x, y });
                    }
                }
            }
        }
    }

    // 计算要挖孔的数量（基于可用位置）
    const holeCount = Math.floor(positions.length * density / 100);

    // 如果没有可用位置或不需要挖孔
    if (holeCount <= 0) {
        return config;
    }

    // 开始构建新的holes数组
    const holes = append ? [...existingHoles] : [];

    // 随机选择位置挖孔
    let addedCount = 0;
    while (addedCount < holeCount && positions.length > 0) {
        const randomIndex = Math.floor(Math.random() * positions.length);
        holes.push(positions[randomIndex]);
        positions.splice(randomIndex, 1);
        addedCount++;
    }

    // 返回新的配置，包含所有孔
    return {
        ...config,
        holes: holes
    };
}
