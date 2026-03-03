// 围棋游戏控制器
class GoGame {
    constructor() {
        this.board = null;
        this.renderer = null;

        this.initDOM();
        this.initBoard('square_19x19', 0, 0, false);
        this.bindEvents();
        this.updateUI();
    }

    initDOM() {
        this.canvas = document.getElementById('go-board');
        this.restartBtn = document.getElementById('restart-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.passBtn = document.getElementById('pass-btn');
        this.applyBtn = document.getElementById('apply-btn');
        this.shapeSelect = document.getElementById('board-shape');
        this.customSizeInput = document.getElementById('custom-size');
        this.customSizeGroup = document.getElementById('custom-size-group');
        this.centerHoleSizeSlider = document.getElementById('center-hole-size');
        this.centerHoleValueDisplay = document.getElementById('center-hole-value');
        this.randomHolesToggle = document.getElementById('random-holes-toggle');
        this.holeDensitySlider = document.getElementById('hole-density');
        this.densityValueDisplay = document.getElementById('density-value');
        this.densityLabel = document.getElementById('density-label');
        this.currentPlayerDisplay = document.getElementById('current-player');
        this.capturedDisplay = document.getElementById('captured');
    }

    initBoard(shapeKey, centerHoleSize, randomDensity, randomHolesEnabled) {
        let config;
        let boardSize;

        if (shapeKey === 'custom') {
            const customSize = parseInt(this.customSizeInput.value);
            if (isNaN(customSize) || customSize < 5 || customSize > 30) {
                this.showMessage("请输入 5-30 之间的有效大小");
                return;
            }
            boardSize = customSize;
            config = createCustomSquare(boardSize);
        } else if (shapeKey === 'square_21x21_center_hole') {
            config = BoardShapes[shapeKey];
            boardSize = 21;
        } else {
            config = BoardShapes[shapeKey];
            boardSize = 19;
        }

        // 应用中心挖孔
        if (centerHoleSize > 0) {
            const centerHoles = generateCenterHoles(boardSize, centerHoleSize);
            config = {
                ...config,
                holes: [...(config.holes || []), ...centerHoles]
            };
        }

        // 应用随机挖孔（如果启用）
        if (randomHolesEnabled && randomDensity > 0) {
            config = generateRandomHoles(config, randomDensity, true);
        }

        this.board = new GoBoard(config);

        if (this.renderer) {
            this.renderer.board = this.board;
            this.renderer.resize();
        } else {
            this.renderer = new GoRenderer(this.canvas, this.board);
        }

        this.renderer.render();
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.renderer.previewPosition = null;
            this.renderer.render();
        });

        this.restartBtn.addEventListener('click', () => this.restart());
        this.undoBtn.addEventListener('click', () => this.undo());
        this.passBtn.addEventListener('click', () => this.pass());
        this.applyBtn.addEventListener('click', () => this.applySettings());

        // 棋盘形状变化时显示/隐藏自定义输入框
        this.shapeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.customSizeGroup.style.display = 'flex';
            } else {
                this.customSizeGroup.style.display = 'none';
            }
        });

        // 中心挖孔大小变化时更新显示
        this.centerHoleSizeSlider.addEventListener('input', (e) => {
            this.centerHoleValueDisplay.textContent = e.target.value;
        });

        // 随机挖孔开关切换
        this.randomHolesToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            this.holeDensitySlider.disabled = !isEnabled;
            this.densityLabel.style.opacity = isEnabled ? '1' : '0.5';
        });

        // 滑块值变化时更新显示
        this.holeDensitySlider.addEventListener('input', (e) => {
            this.densityValueDisplay.textContent = e.target.value;
        });

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.renderer.render();
        });
    }

    handleClick(e) {
        const pos = this.renderer.screenToBoard(e.clientX, e.clientY);
        if (!pos) return;

        if (this.board.placeStone(pos.x, pos.y)) {
            this.renderer.render();
            this.updateUI();
        } else {
            this.showMessage("无效的落子位置");
        }
    }

    handleMouseMove(e) {
        const pos = this.renderer.screenToBoard(e.clientX, e.clientY);
        this.renderer.previewPosition = pos;
        this.renderer.render();
    }

    restart() {
        if (!confirm("确定要重新开始吗？")) return;
        const currentShape = this.shapeSelect.value;
        const centerHoleSize = parseInt(this.centerHoleSizeSlider.value);
        const randomDensity = parseInt(this.holeDensitySlider.value);
        const randomHolesEnabled = this.randomHolesToggle.checked;
        this.initBoard(currentShape, centerHoleSize, randomDensity, randomHolesEnabled);
        this.updateUI();
    }

    applySettings() {
        const currentShape = this.shapeSelect.value;
        const centerHoleSize = parseInt(this.centerHoleSizeSlider.value);
        const randomDensity = parseInt(this.holeDensitySlider.value);
        const randomHolesEnabled = this.randomHolesToggle.checked;

        if (!confirm("应用设置将生成新的挖孔布局并重置游戏，确定吗？")) return;

        if (currentShape === 'custom') {
            const customSize = parseInt(this.customSizeInput.value);
            if (isNaN(customSize) || customSize < 5 || customSize > 30) {
                this.showMessage("请输入 5-30 之间的有效大小");
                return;
            }
        }

        this.initBoard(currentShape, centerHoleSize, randomDensity, randomHolesEnabled);
        this.updateUI();

        let message = `已应用设置`;
        if (centerHoleSize > 0) {
            message += `：中心挖孔 ${centerHoleSize}×${centerHoleSize}`;
        }
        if (randomHolesEnabled && randomDensity > 0) {
            message += `，随机挖孔密度 ${randomDensity}%`;
        }
        this.showMessage(message);
    }

    undo() {
        if (this.board.undo()) {
            this.renderer.render();
            this.updateUI();
        } else {
            this.showMessage("没有可以悔的棋");
        }
    }

    pass() {
        this.board.pass();
        this.renderer.render();
        this.updateUI();
        this.showMessage("虚着");
    }

    updateUI() {
        const playerName = this.board.currentPlayer === 1 ? "黑方" : "白方";
        this.currentPlayerDisplay.textContent = playerName;
        this.currentPlayerDisplay.style.color = this.board.currentPlayer === 1 ? "#000" : "#666";

        this.capturedDisplay.textContent =
            `黑方提子: ${this.board.captured.black} | 白方提子: ${this.board.captured.white}`;

        this.undoBtn.disabled = this.board.history.length === 0;
    }

    showMessage(msg) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}

// 初始化游戏
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GoGame();
});
