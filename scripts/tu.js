/**
 *
 * textureUnpacker
 *
 * @version  : 1.1
 * @author   : Enea Entertainment
 * @homepage : http://www.enea.sk
 *
 */

//==================================================
// 全局变量
//==================================================

// 应用状态管理
let step = -1;

// 文件数据
let filePNG;
let fileJSON;
let fileNameJSON = 'download';

// PIXI.js 相关
let renderer;
let stage;
let destination;

// 工具实例
const reader = new FileReader();
const zip = new JSZip();

// UI 文本
const stepByStepMessages = [
    'unpack texture atlases created with TexturePacker (PixiJS, Phaser) and save them as individual images or download them all at once as zip file.<br>Supports trimmed and rotated textures, too.<br><br><b>Start with choosing PNG file</b>',
    'OK, now <b>choose corresponding JSON file</b>',
    'Unpacking done. Left click on the images to save them on your computer.'
];

const unpackerMessages = [
    'Loading ',
    '. Please wait...',
    ' loaded'
];

//==================================================
// 页面初始化
//==================================================

window.onload = () => {
    initializeApp();
};

/**
 * 初始化应用程序
 */
function initializeApp() {
    destination = document.getElementById('destContent');
    message('tutorial', stepByStepMessages[0]);
    show('stepByStep');
    show('filesForm');
}

//==================================================
// UI 操作函数
//==================================================

/**
 * 显示指定元素
 * @param {string} id - 元素ID
 */
function show(id) {
    document.getElementById(id).style.display = '';
}

/**
 * 隐藏指定元素
 * @param {string} id - 元素ID
 */
function hide(id) {
    document.getElementById(id).style.display = 'none';
}

/**
 * 更新指定元素的消息内容
 * @param {string} id - 元素ID
 * @param {string} txt - 消息文本
 */
function message(id, txt) {
    document.getElementById(id).innerHTML = txt;
}

//==================================================
// 文件处理函数
//==================================================

/**
 * 读取并处理用户选择的文件
 * @param {Object} input - 文件输入元素
 */
function readURL(input) {
    if (input.files && input.files[0]) {
        show('messages');
        message('msg', unpackerMessages[0] + input.files[0] + unpackerMessages[1]);
        step++;
        
        reader.onload = handleFileLoad.bind(null, input);
        
        switch (step) {
            case 0:
                reader.readAsDataURL(input.files[0]);
                break;
            case 1:
                reader.readAsText(input.files[0]);
                break;
        }
    }
}

/**
 * 处理文件加载完成事件
 * @param {Object} input - 文件输入元素
 * @param {Object} e - 加载事件对象
 */
function handleFileLoad(input, e) {
    message('tutorial', stepByStepMessages[step + 1]);
    message('msg', input.files[0].name + unpackerMessages[2]);

    switch (step) {
        case 0:
            filePNG = e.target.result;
            document.getElementById('form').reset();
            break;

        case 1:
            fileNameJSON = input.files[0].name.replace(/\.[^/.]+$/, '');
            fileJSON = JSON.parse(e.target.result);
            hide('filesForm');
            hide('messages');
            show('restartButton');
            start();
            break;
    }
}

//==================================================
// 核心功能函数
//==================================================

/**
 * 启动解包过程
 */
function start() {
    // 创建渲染器
    renderer = new PIXI.CanvasRenderer(100, 100, { transparent: true });
    renderer.view.style.display = 'none';

    // 将渲染器添加到DOM中
    document.getElementById('sourceContent').appendChild(renderer.view);

    // 创建舞台
    stage = new PIXI.Container();

    // 加载图像
    PIXI.loader.add('image', filePNG).load(onAssetsLoaded);
}

/**
 * 资源加载完成后回调函数
 * @param {Object} loader - PIXI加载器
 * @param {Object} resources - 加载的资源
 */
function onAssetsLoaded(loader, resources) {
    const spritesheet = new PIXI.Spritesheet(
        resources.image.texture.baseTexture, 
        fileJSON, 
        fileNameJSON
    );

    spritesheet.parse((result) => {
        // 遍历所有纹理并处理
        for (const textureName in result) {
            processTexture(result[textureName], textureName);
        }

        message('msg', unpackerMessages[3]);
        show('unpackResult');
    });
}

/**
 * 处理单个纹理
 * @param {Object} texture - PIXI纹理对象
 * @param {string} textureName - 纹理名称
 */
function processTexture(texture, textureName) {
    // 创建精灵
    const sprite = new PIXI.Sprite(texture);
    stage.addChild(sprite);

    // 抓取纹理数据
    grab(sprite, textureName);

    stage.removeChild(sprite);
}

/**
 * 抓取并保存精灵图像数据
 * @param {Object} sprite - PIXI精灵对象
 * @param {string} textureName - 纹理名称
 */
function grab(sprite, textureName) {
    // 获取不带路径的文件名
    const fileName = textureName.replace(/^.*[\\\/]/, '');

    // 创建锚点元素
    const anchor = createAnchorElement(fileName, textureName, sprite);
    destination.appendChild(anchor);

    // 创建画布
    const canvas = createCanvasElement(sprite);
    anchor.appendChild(canvas);

    // 渲染并绘制纹理
    renderTextureToCanvas(canvas, sprite);

    // 设置锚点链接
    anchor.href = canvas.toDataURL();
}

/**
 * 创建锚点元素
 * @param {string} fileName - 文件名
 * @param {string} textureName - 纹理名称
 * @param {Object} sprite - PIXI精灵对象
 * @returns {HTMLElement} 锚点元素
 */
function createAnchorElement(fileName, textureName, sprite) {
    const anchor = document.createElement('a');
    anchor.download = fileName;
    anchor.title = `${textureName} | ${sprite.width}x${sprite.height}`;
    return anchor;
}

/**
 * 创建画布元素
 * @param {Object} sprite - PIXI精灵对象
 * @returns {HTMLElement} 画布元素
 */
function createCanvasElement(sprite) {
    const canvas = document.createElement('canvas');
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    canvas.style.border = '1px solid';
    canvas.style.display = 'inline';
    canvas.style.margin = '5px 5px';
    return canvas;
}

/**
 * 将纹理渲染到画布上
 * @param {HTMLElement} canvas - 画布元素
 * @param {Object} sprite - PIXI精灵对象
 */
function renderTextureToCanvas(canvas, sprite) {
    renderer.resize(sprite.width, sprite.height);
    renderer.render(stage);

    // 获取画布上下文并绘制纹理
    const context = canvas.getContext('2d');
    context.drawImage(renderer.view, 0, 0);
}

/**
 * 下载所有解包的图像
 */
function downloadAll() {
    const list = destination.querySelectorAll('a');

    for (let i = 0; i < list.length; i++) {
        const title = list[i].getAttribute('title');
        const path = title.split('|')[0].trim();
        const data = list[i].getAttribute('href').split(',')[1];
        zip.file(path, data, { base64: true });
    }

    zip.generateAsync({ type: 'blob' })
        .then((result) => {
            saveAs(result, `${fileNameJSON}.zip`);
        });
}