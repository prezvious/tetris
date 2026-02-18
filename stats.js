/**
 * Stats.js - Performance Monitor (Refactored)
 * Original logic from: stats.js r6
 */
class Stats {
    constructor() {
        this.startTime = Date.now();
        this.prevTime = this.startTime;
        this.frames = 0;
        this.mode = 0; // 0: FPS, 1: MS, 2: MEM

        // Container setup
        this.container = document.createElement('div');
        this.container.style.cssText = 'cursor:pointer;width:80px;opacity:0.9;z-index:10001';
        this.container.addEventListener('click', (event) => {
            event.preventDefault();
            this.showPanel(++this.mode % this.container.children.length);
        }, false);

        // --- Create Panels ---

        // FPS Panel
        this.fpsPanel = new Panel('FPS', '#0ff', '#002');
        this.container.appendChild(this.fpsPanel.dom);

        // MS Panel
        this.msPanel = new Panel('MS', '#0f0', '#020');
        this.msPanel.dom.style.display = 'none';
        this.container.appendChild(this.msPanel.dom);

        // Memory Panel (if supported)
        if (self.performance && self.performance.memory) {
            this.memPanel = new Panel('MB', '#f08', '#201');
            this.memPanel.dom.style.display = 'none';
            this.container.appendChild(this.memPanel.dom);
        }

        // Tracking variables
        this.prevFpsTime = this.startTime;
        this.frames = 0;

        // Min/Max tracking
        this.msMin = 1000;
        this.msMax = 0;
        this.fpsMin = 1000;
        this.fpsMax = 0;
        this.memMin = 1000;
        this.memMax = 0;
    }

    /**
     * Expose the DOM element to be appended to the document
     */
    get domElement() {
        return this.container;
    }

    /**
     * Switch visible panel
     */
    showPanel(id) {
        for (let i = 0; i < this.container.children.length; i++) {
            this.container.children[i].style.display = i === id ? 'block' : 'none';
        }
        this.mode = id;
    }

    /**
     * Main update loop
     */
    update() {
        this.frames++;
        const time = Date.now();

        // Calculate MS (delta time)
        const ms = time - this.prevTime;
        this.msMin = Math.min(this.msMin, ms);
        this.msMax = Math.max(this.msMax, ms);

        this.msPanel.update(ms, 200, `${ms} MS`, `(${this.msMin}-${this.msMax})`);

        this.prevTime = time;

        // Calculate FPS (every 1 second)
        if (time >= this.prevFpsTime + 1000) {
            const fps = Math.round((this.frames * 1000) / (time - this.prevFpsTime));
            this.fpsMin = Math.min(this.fpsMin, fps);
            this.fpsMax = Math.max(this.fpsMax, fps);

            this.fpsPanel.update(fps, 100, `${fps} FPS`, `(${this.fpsMin}-${this.fpsMax})`);

            this.prevFpsTime = time;
            this.frames = 0;

            // Calculate Memory (if supported)
            if (this.memPanel) {
                const mem = performance.memory.usedJSHeapSize / 1048576;
                this.memMin = Math.min(this.memMin, mem);
                this.memMax = Math.max(this.memMax, mem);

                this.memPanel.update(mem, 100, `${Math.round(mem)} MB`, `(${Math.round(this.memMin)}-${Math.round(this.memMax)})`);
            }
        }
    }
}

/**
 * Internal class to handle individual graph panels
 */
class Panel {
    constructor(name, fg, bg) {
        this.name = name;
        this.fg = fg;
        this.bg = bg;
        this.PR = Math.round(window.devicePixelRatio || 1);

        this.WIDTH = 74 * this.PR;
        this.HEIGHT = 30 * this.PR;
        this.TEXT_X = 3 * this.PR;
        this.TEXT_Y = 2 * this.PR;
        this.GRAPH_X = 3 * this.PR;
        this.GRAPH_Y = 15 * this.PR;
        this.GRAPH_WIDTH = 74 * this.PR;
        this.GRAPH_HEIGHT = 30 * this.PR;

        // Container
        this.dom = document.createElement('div');
        this.dom.style.cssText = 'padding:0 0 3px 3px;text-align:left;background:' + bg;

        // Text Label
        this.text = document.createElement('div');
        this.text.style.cssText = 'font-family:Helvetica,Arial,sans-serif;font-size:' + (9 * this.PR) + 'px;font-weight:bold;line-height:' + (15 * this.PR) + 'px;color:' + fg;
        this.text.innerHTML = name;
        this.dom.appendChild(this.text);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.GRAPH_WIDTH;
        this.canvas.height = this.GRAPH_HEIGHT;
        this.canvas.style.cssText = 'width:74px;height:30px;display:block';
        this.dom.appendChild(this.canvas);

        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = bg;
        this.context.fillRect(0, 0, this.GRAPH_WIDTH, this.GRAPH_HEIGHT);

        // Data for pixel shifting
        this.imageData = this.context.getImageData(0, 0, this.GRAPH_WIDTH, this.GRAPH_HEIGHT);
    }

    update(value, maxValue, labelOne, labelTwo) {
        // Update Text
        this.text.innerHTML = `${labelOne} <span style="font-weight:normal">${labelTwo}</span>`;

        // Update Graph (Pixel Shift)
        const minGraph = Math.min(30, 30 - (value / maxValue) * 30);

        // Original pixel shifting logic from stats.js r6
        // We shift the image data left by 1 pixel (actually 1 column)
        const data = this.imageData.data;
        const width = this.GRAPH_WIDTH;
        const height = this.GRAPH_HEIGHT;

        // Shift existing pixels left
        for (let y = 0; y < height; y++) {
            // Loop through columns up to the second-to-last
            for (let x = 0; x < width - 1; x++) {
                const index = (y * width + x) * 4;
                const nextIndex = (y * width + (x + 1)) * 4;

                data[index] = data[nextIndex];         // R
                data[index + 1] = data[nextIndex + 1]; // G
                data[index + 2] = data[nextIndex + 2]; // B
                data[index + 3] = data[nextIndex + 3]; // A
            }
        }

        // Draw new column at the right edge
        // Parse hex colors to RGB for pixel manipulation
        const bgRGB = this.hexToRgb(this.bg);
        const fgRGB = this.hexToRgb(this.fg);

        for (let y = 0; y < height; y++) {
            const index = (y * width + (width - 1)) * 4;
            // If y is below the value threshold, draw FG, else BG
            const color = y < minGraph ? bgRGB : fgRGB;

            data[index] = color.r;
            data[index + 1] = color.g;
            data[index + 2] = color.b;
            data[index + 3] = 255; // Alpha
        }

        this.context.putImageData(this.imageData, 0, 0);
    }

    hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
}