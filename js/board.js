// 围棋棋盘类 - 支持任意形状的棋盘
class GoBoard {
    constructor(shapeConfig) {
        // 有效位置集合：使用 Set 存储 "x,y" 字符串
        this.validPositions = new Set();

        // 棋盘状态：使用 Map 存储 "x,y" -> 棋子颜色
        // 0: 空, 1: 黑, 2: 白, -1: 阻拦格
        this.stones = new Map();

        // 当前玩家 (1: 黑, 2: 白)
        this.currentPlayer = 1;

        // 历史记录（用于悔棋）
        this.history = [];

        // 最后落子位置
        this.lastMove = null;

        // 提子计数
        this.captured = { black: 0, white: 0 };

        // 棋盘边界（用于渲染）
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        // 初始化棋盘形状
        this.initShape(shapeConfig);
    }

    // 初始化棋盘形状
    initShape(config) {
        const { type, size, radius, holes } = config;

        if (type === 'square') {
            this.initSquare(size);
        } else if (type === 'triangle') {
            this.initTriangle(size);
        } else if (type === 'hexagon') {
            this.initHexagon(radius);
        }

        // 处理挖孔
        if (holes) {
            this.addHoles(holes);
        }

        // 计算边界
        this.calculateBounds();
    }

    // 方形棋盘
    initSquare(size) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const key = `${x},${y}`;
                this.validPositions.add(key);
                this.stones.set(key, 0);
            }
        }
    }

    // 三角形棋盘
    initTriangle(size) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= y; x++) {
                const key = `${x},${y}`;
                this.validPositions.add(key);
                this.stones.set(key, 0);
            }
        }
    }

    // 六边形棋盘
    initHexagon(radius) {
        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);
            for (let r = r1; r <= r2; r++) {
                // 转换为笛卡尔坐标
                const x = q + radius;
                const y = r + radius;
                const key = `${x},${y}`;
                this.validPositions.add(key);
                this.stones.set(key, 0);
            }
        }
    }

    // 添加挖孔（阻拦格）
    addHoles(holes) {
        for (const hole of holes) {
            const key = `${hole.x},${hole.y}`;
            if (this.validPositions.has(key)) {
                this.stones.set(key, -1); // -1 表示阻拦格
            }
        }
    }

    // 计算渲染边界
    calculateBounds() {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const pos of this.validPositions) {
            const [x, y] = pos.split(',').map(Number);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        this.bounds = { minX, maxX, minY, maxY };
    }

    // 检查位置是否在棋盘内且可落子
    isValidPosition(x, y) {
        const key = `${x},${y}`;
        return this.validPositions.has(key) && this.stones.get(key) !== -1;
    }

    // 检查位置是否有棋子
    hasStone(x, y) {
        const key = `${x},${y}`;
        const stone = this.stones.get(key);
        return stone === 1 || stone === 2;
    }

    // 获取某位置的棋子颜色
    getStone(x, y) {
        const key = `${x},${y}`;
        return this.stones.get(key) || 0;
    }

    // 检查是否是阻拦格
    isBlocked(x, y) {
        const key = `${x},${y}`;
        return this.stones.get(key) === -1;
    }

    // 获取相邻位置（考虑边界）
    getNeighbors(x, y) {
        const directions = [
            { dx: 0, dy: -1 },  // 上
            { dx: 0, dy: 1 },   // 下
            { dx: -1, dy: 0 },  // 左
            { dx: 1, dy: 0 }    // 右
        ];

        const neighbors = [];
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            const key = `${nx},${ny}`;
            // 只返回有效位置（包括阻拦格）
            if (this.validPositions.has(key)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    // 计算气（考虑阻拦格）
    getLiberties(x, y) {
        const color = this.getStone(x, y);
        if (color !== 1 && color !== 2) {
            return new Set();
        }

        const visited = new Set();
        const liberties = new Set();
        const stack = [{ x, y }];

        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.x},${current.y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const neighbors = this.getNeighbors(current.x, current.y);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                const neighborColor = this.stones.get(neighborKey);

                if (neighborColor === 0) {
                    // 空位，是气
                    liberties.add(neighborKey);
                } else if (neighborColor === color) {
                    // 同色棋子，继续搜索
                    if (!visited.has(neighborKey)) {
                        stack.push(neighbor);
                    }
                }
                // 阻拦格(-1)和异色棋子，不做处理
            }
        }

        return liberties;
    }

    // 获取棋串（相连的同色棋子组）
    getGroup(x, y) {
        const color = this.getStone(x, y);
        if (color !== 1 && color !== 2) {
            return [];
        }

        const visited = new Set();
        const group = [];
        const stack = [{ x, y }];

        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.x},${current.y}`;

            if (visited.has(key)) continue;
            visited.add(key);
            group.push(current);

            const neighbors = this.getNeighbors(current.x, current.y);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (this.stones.get(neighborKey) === color && !visited.has(neighborKey)) {
                    stack.push(neighbor);
                }
            }
        }

        return group;
    }

    // 检查提子
    checkCaptures(x, y, color) {
        const opponent = color === 1 ? 2 : 1;
        const neighbors = this.getNeighbors(x, y);

        const capturedStones = [];
        const checked = new Set();

        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (checked.has(key)) continue;

            if (this.stones.get(key) === opponent) {
                const liberties = this.getLiberties(neighbor.x, neighbor.y);
                if (liberties.size === 0) {
                    const group = this.getGroup(neighbor.x, neighbor.y);
                    capturedStones.push(...group);
                    // 标记已检查的棋子
                    for (const stone of group) {
                        checked.add(`${stone.x},${stone.y}`);
                    }
                }
            }
        }

        return capturedStones;
    }

    // 检查是否可以落子
    canPlace(x, y) {
        // 1. 边界和阻拦格检查
        if (!this.isValidPosition(x, y)) {
            return { valid: false, reason: "该位置无法落子" };
        }

        // 2. 位置已有棋子
        if (this.hasStone(x, y)) {
            return { valid: false, reason: "该位置已有棋子" };
        }

        const color = this.currentPlayer;

        // 3. 临时落子，检查气
        const key = `${x},${y}`;
        const originalValue = this.stones.get(key);
        this.stones.set(key, color);

        // 检查是否可以提对方的子
        const captures = this.checkCaptures(x, y, color);
        const canCapture = captures.length > 0;

        // 检查自己是否有气
        const liberties = this.getLiberties(x, y);
        const hasLiberties = liberties.size > 0;

        // 恢复原值
        this.stones.set(key, originalValue);

        // 如果能提子，或者落子后自己有气，则可以落子
        if (canCapture || hasLiberties) {
            return { valid: true };
        }

        return { valid: false, reason: "禁入点（气尽且不能提子）" };
    }

    // 移除被提的棋子
    removeCaptured(stones) {
        for (const stone of stones) {
            const key = `${stone.x},${stone.y}`;
            this.stones.set(key, 0);
        }
    }

    // 保存状态
    saveState() {
        this.history.push({
            stones: new Map(this.stones),
            player: this.currentPlayer,
            lastMove: this.lastMove ? { ...this.lastMove } : null,
            captured: { ...this.captured }
        });
    }

    // 落子
    placeStone(x, y) {
        const check = this.canPlace(x, y);
        if (!check.valid) {
            return false;
        }

        // 保存状态
        this.saveState();

        const color = this.currentPlayer;
        const key = `${x},${y}`;

        // 落子
        this.stones.set(key, color);

        // 检查并提子
        const captures = this.checkCaptures(x, y, color);
        this.removeCaptured(captures);

        // 更新提子计数
        if (color === 1) {
            this.captured.white += captures.length;
        } else {
            this.captured.black += captures.length;
        }

        // 记录最后落子
        this.lastMove = { x, y };

        // 切换玩家
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        return true;
    }

    // 悔棋
    undo() {
        if (this.history.length === 0) {
            return false;
        }

        const state = this.history.pop();
        this.stones = state.stones;
        this.currentPlayer = state.player;
        this.lastMove = state.lastMove;
        this.captured = state.captured;

        return true;
    }

    // 虚着
    pass() {
        this.saveState();
        this.lastMove = null;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }
}
