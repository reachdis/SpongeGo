// 围棋渲染器 - 支持任意形状棋盘的Canvas渲染
class GoRenderer {
    constructor(canvas, board) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.board = board;
        this.previewPosition = null;
        this.resize();
    }

    resize() {
        const container = this.canvas.parentElement;
        const maxSize = Math.min(container.clientWidth, container.clientHeight) - 20;

        this.canvas.width = maxSize;
        this.canvas.height = maxSize;
        this.canvas.style.width = maxSize + 'px';
        this.canvas.style.height = maxSize + 'px';

        // 根据棋盘边界计算格子大小
        const boardWidth = this.board.bounds.maxX - this.board.bounds.minX;
        const boardHeight = this.board.bounds.maxY - this.board.bounds.minY;
        const maxDimension = Math.max(boardWidth, boardHeight);

        this.padding = 40;
        this.boardPixelSize = maxSize - this.padding * 2;
        this.cellSize = this.boardPixelSize / maxDimension;
    }

    // 坐标转换：棋盘坐标 -> 屏幕坐标
    boardToScreen(x, y) {
        const screenX = this.padding + (x - this.board.bounds.minX) * this.cellSize;
        const screenY = this.padding + (y - this.board.bounds.minY) * this.cellSize;
        return { x: screenX, y: screenY };
    }

    // 坐标转换：屏幕坐标 -> 棋盘坐标
    screenToBoard(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        const boardX = Math.round((x - this.padding) / this.cellSize) + this.board.bounds.minX;
        const boardY = Math.round((y - this.padding) / this.cellSize) + this.board.bounds.minY;

        if (this.board.isValidPosition(boardX, boardY)) {
            return { x: boardX, y: boardY };
        }
        return null;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground();
        this.drawGrid();
        this.drawStones();
        this.drawLastMoveMarker();
        this.drawPreview();
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#DEB887');
        gradient.addColorStop(0.5, '#D2A679');
        gradient.addColorStop(1, '#C49A6C');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;

        // 绘制有效位置之间的连线
        const drawn = new Set();

        for (const posKey of this.board.validPositions) {
            const [x, y] = posKey.split(',').map(Number);
            const pos = this.boardToScreen(x, y);

            // 检查四个方向
            const directions = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 }
            ];

            for (const dir of directions) {
                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const nKey = `${nx},${ny}`;

                if (this.board.validPositions.has(nKey) && !drawn.has(nKey + '-' + posKey)) {
                    const nPos = this.boardToScreen(nx, ny);
                    this.ctx.beginPath();
                    this.ctx.moveTo(pos.x, pos.y);
                    this.ctx.lineTo(nPos.x, nPos.y);
                    this.ctx.stroke();
                    drawn.add(posKey + '-' + nKey);
                }
            }

            // 绘制交叉点
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 绘制阻拦格（挖孔）标记
        for (const [key, value] of this.board.stones) {
            if (value === -1) {
                const [x, y] = key.split(',').map(Number);
                const pos = this.boardToScreen(x, y);

                this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, this.cellSize * 0.3, 0, Math.PI * 2);
                this.ctx.fill();

                // 画X
                this.ctx.strokeStyle = '#666666';
                this.ctx.lineWidth = 2;
                const r = this.cellSize * 0.2;
                this.ctx.beginPath();
                this.ctx.moveTo(pos.x - r, pos.y - r);
                this.ctx.lineTo(pos.x + r, pos.y + r);
                this.ctx.moveTo(pos.x + r, pos.y - r);
                this.ctx.lineTo(pos.x - r, pos.y + r);
                this.ctx.stroke();
            }
        }
    }

    drawStones() {
        for (const [key, value] of this.board.stones) {
            if (value === 1 || value === 2) {
                const [x, y] = key.split(',').map(Number);
                this.drawStone(x, y, value);
            }
        }
    }

    drawStone(x, y, color, isPreview = false) {
        const pos = this.boardToScreen(x, y);
        const radius = this.cellSize * 0.45;

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

        if (color === 1) {
            // 黑棋渐变 - 更深的颜色以提高对比度
            const gradient = this.ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
                pos.x, pos.y, radius
            );
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(0.7, '#000000');
            gradient.addColorStop(1, '#000000');
            this.ctx.fillStyle = gradient;
        } else {
            // 白棋渐变
            const gradient = this.ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
                pos.x, pos.y, radius
            );
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(1, '#CCCCCC');
            this.ctx.fillStyle = gradient;
        }

        if (isPreview) {
            this.ctx.globalAlpha = 0.5;
        }

        this.ctx.fill();

        if (!isPreview) {
            this.ctx.strokeStyle = color === 1 ? '#000000' : '#999999';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1.0;
    }

    drawLastMoveMarker() {
        if (!this.board.lastMove) return;

        const { x, y } = this.board.lastMove;
        const pos = this.boardToScreen(x, y);
        const color = this.board.getStone(x, y);

        this.ctx.fillStyle = color === 1 ? '#FFFFFF' : '#000000';
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, this.cellSize * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPreview() {
        if (!this.previewPosition) return;
        const { x, y } = this.previewPosition;

        if (this.board.getStone(x, y) === 0) {
            this.drawStone(x, y, this.board.currentPlayer, true);
        }
    }
}
