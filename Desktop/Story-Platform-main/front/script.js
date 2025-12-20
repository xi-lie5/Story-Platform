// 故事数据模型
let storyData = {
    title: '',
    description: '',
    coverImage: null,
    nodes: [],
    characters: [],
    currentNodeId: null
};

// 节点类型常量
const NODE_TYPES = {
    REGULAR: 'regular',
    BRANCH: 'branch',
    END: 'end'
};

// DOM元素引用
let elements = {};

// 初始化应用
function initApp() {
    // 获取DOM元素
    getElements();
    
    // 绑定事件监听
    bindEvents();
    
    // 编辑器页面初始化
    // 创建初始节点（如果没有节点）
    if (storyData.nodes.length === 0) {
        createInitialNode();
    } else {
        renderNodesCanvas();
        updatePreview();
    }
    
    // 初始化画布平移功能
    initCanvasPan();
    
    // 添加保存状态指示器样式
    addSaveStatusStyles();
}

// 添加保存状态指示器样式
function addSaveStatusStyles() {
    // 检查样式是否已存在
    if (document.getElementById('saveStatusStyles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'saveStatusStyles';
    style.textContent = `
        .save-status-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 25px;
            color: white;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            transition: all 0.3s ease;
            opacity: 1;
            transform: translateY(0);
        }
        
        .save-status-indicator.success {
            background-color: #10b981;
        }
        
        .save-status-indicator.error {
            background-color: #ef4444;
        }
        
        .save-status-indicator.pending {
            background-color: #3b82f6;
        }
        
        .validation-errors {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            max-width: 500px;
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            color: #991b1b;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
        }
        
        .validation-errors h3 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
        }
        
        .validation-errors ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .validation-errors li {
            margin-bottom: 8px;
            font-size: 14px;
        }
    `;
    
    document.head.appendChild(style);
}

// 获取DOM元素
function getElements() {
    elements = {
        // 故事信息
        storyTitle: document.getElementById('storyTitle'),
        storyDescription: document.getElementById('storyDescription'),
        storyInfoForm: document.getElementById('storyInfoForm'),
        coverImage: document.getElementById('coverImage'),
        coverPreview: document.getElementById('coverPreview'),
        titleError: document.getElementById('titleError'),
        descriptionError: document.getElementById('descriptionError'),
        
    
        
        // 分支管理
        addBranchBtn: document.getElementById('addBranchBtn'),
        nodesCanvas: document.getElementById('nodesCanvas'),
        branchText: document.getElementById('branchText'),
        newNodeType: document.getElementById('newNodeType'),
        branchNodeTitle: document.getElementById('branchNodeTitle'),
        branchNodeContent: document.getElementById('branchNodeContent'),
        
        // 角色管理
        addCharacterBtn: document.getElementById('addCharacterBtn'),
        charactersList: document.getElementById('charactersList'),
        characterModal: document.getElementById('characterModal'),
        characterModalTitle: document.getElementById('characterModalTitle'),
        closeCharacterModal: document.getElementById('closeCharacterModal'),
        cancelCharacterBtn: document.getElementById('cancelCharacterBtn'),
        saveCharacterBtn: document.getElementById('saveCharacterBtn'),
        characterId: document.getElementById('characterId'),
        characterName: document.getElementById('characterName'),
        characterDescription: document.getElementById('characterDescription'),
        characterError: document.getElementById('characterError'),
        
        // 节点编辑
        nodeEditModal: document.getElementById('nodeEditModal'),
        closeNodeEditModal: document.getElementById('closeNodeEditModal'),
        cancelNodeEditBtn: document.getElementById('cancelNodeEditBtn'),
        saveNodeEditBtn: document.getElementById('saveNodeEditBtn'),
        nodeEditTitle: document.getElementById('nodeEditTitle'),
        nodeEditContent: document.getElementById('nodeEditContent'),
        nodeEditError: document.getElementById('nodeEditError'),
        
        // 预览
        previewPanel: document.getElementById('previewPanel'),
        previewToggle: document.getElementById('previewToggle'),
        previewContent: document.getElementById('previewContent'),
        
        // 故事统计
        nodesCount: document.getElementById('nodesCount'),
        branchesCount: document.getElementById('branchesCount'),
        charactersCount: document.getElementById('charactersCount'),
        totalWords: document.getElementById('totalWords'),
        
        // 工具栏
        exportBtn: document.getElementById('exportBtn'),
        saveBtn: document.getElementById('saveBtn'),
    };
}

// 绑定事件监听
function bindEvents() {

    
    // 故事信息事件
    if (elements.storyTitle) {
        elements.storyTitle.addEventListener('input', updateStoryData);
        elements.storyTitle.addEventListener('blur', validateStoryTitle);
        elements.storyTitle.addEventListener('input', validateStoryTitle);
    }
    
    if (elements.storyDescription) {
        elements.storyDescription.addEventListener('input', updateStoryData);
        elements.storyDescription.addEventListener('blur', validateStoryDescription);
        elements.storyDescription.addEventListener('input', validateStoryDescription);
    }
    
    // 故事信息表单提交事件
    if (elements.storyInfoForm) {
        elements.storyInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            validateStoryInfoForm();
        });
    }
    
    if (elements.coverImage) {
        elements.coverImage.addEventListener('change', handleCoverImageUpload);
    }
    
    // 分支管理事件（仅在编辑器页面存在）
    if (elements.addBranchBtn) {
        elements.addBranchBtn.addEventListener('click', addBranch);
    }
    
    // 角色管理事件（仅在编辑器页面存在）
    if (elements.addCharacterBtn) {
        elements.addCharacterBtn.addEventListener('click', openCharacterModal);
    }
    
    if (elements.closeCharacterModal) {
        elements.closeCharacterModal.addEventListener('click', closeCharacterModal);
    }
    
    if (elements.cancelCharacterBtn) {
        elements.cancelCharacterBtn.addEventListener('click', closeCharacterModal);
    }
    
    if (elements.saveCharacterBtn) {
        elements.saveCharacterBtn.addEventListener('click', saveCharacter);
    }
    

    

    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (elements.characterModal && e.target === elements.characterModal) {
            closeCharacterModal();
        }
        if (elements.nodeEditModal && e.target === elements.nodeEditModal) {
            closeNodeEditModal();
        }
    });
    
    // 节点编辑模态框事件
    if (elements.closeNodeEditModal) {
        elements.closeNodeEditModal.addEventListener('click', closeNodeEditModal);
    }
    if (elements.cancelNodeEditBtn) {
        elements.cancelNodeEditBtn.addEventListener('click', closeNodeEditModal);
    }
    if (elements.saveNodeEditBtn) {
        elements.saveNodeEditBtn.addEventListener('click', saveNodeEdit);
    }
    
    // 预览事件（仅在编辑器页面存在）
    if (elements.previewToggle) {
        elements.previewToggle.addEventListener('click', togglePreviewPanel);
    }
    
    // 工具栏事件
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportStoryData);
    }
    
    // 保存按钮事件
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', saveStory);
    }
}

// 更新故事信息表单
function updateStoryInfoForm() {
    if (elements.storyTitle) {
        elements.storyTitle.value = storyData.title;
    }
    
    if (elements.storyDescription) {
        elements.storyDescription.value = storyData.description;
    }
    
    // 更新封面预览
    if (elements.coverPreview && storyData.coverImage) {
        elements.coverPreview.innerHTML = `<img src="${storyData.coverImage}" alt="封面预览">`;
    }
}

// 更新故事统计信息
function updateStoryStats() {
    // 计算总分支数
    const totalBranches = storyData.nodes.reduce((count, node) => count + node.branches.length, 0);
    
    // 计算总字数
    const totalWords = storyData.nodes.reduce((count, node) => count + node.content.trim().split(/\s+/).length, 0);
    
    // 更新统计显示
    if (elements.nodesCount) {
        elements.nodesCount.textContent = storyData.nodes.length;
    }
    
    if (elements.branchesCount) {
        elements.branchesCount.textContent = totalBranches;
    }
    
    if (elements.charactersCount) {
        elements.charactersCount.textContent = storyData.characters.length;
    }
    
    if (elements.totalWords) {
        elements.totalWords.textContent = totalWords;
    }
}

// 创建初始根节点
function createInitialNode() {
    // 检查是否已经存在节点，如果存在则不再创建
    if (storyData.nodes.length > 0) {
        return;
    }
    
    // 生成更完善的根节点，包含预设的基础属性和初始配置
    const rootNode = {
        id: 'root_' + generateId(),
        title: '故事起点',
        content: '这是你的故事的开始。从这里出发，构建你的互动叙事之旅...',
        media: [],
        branches: [],
        x: 100,
        y: 100,
        isRoot: true, // 标记为根节点
        type: NODE_TYPES.REGULAR, // 根节点必须是regular类型
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
            author: '系统生成',
            version: '1.0'
        }
    };
    
    storyData.nodes.push(rootNode);
    storyData.currentNodeId = rootNode.id;
    
    renderNodesCanvas();
    updatePreview();
}

// 生成唯一ID
function generateId() {
    return 'node_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// 验证故事标题
function validateStoryTitle() {
    const title = elements.storyTitle.value.trim();
    const errorElement = elements.titleError;
    
    if (!title) {
        errorElement.textContent = '故事标题不能为空';
        return false;
    }
    
    if (title.length > 50) {
        errorElement.textContent = `故事标题不能超过50个字符，当前${title.length}个`;
        return false;
    }
    
    errorElement.textContent = '';
    return true;
}

// 验证故事简介
function validateStoryDescription() {
    const description = elements.storyDescription.value.trim();
    const errorElement = elements.descriptionError;
    
    if (!description) {
        errorElement.textContent = '故事简介不能为空';
        return false;
    }
    
    if (description.length > 500) {
        errorElement.textContent = `故事简介不能超过500个字符，当前${description.length}个`;
        return false;
    }
    
    errorElement.textContent = '';
    return true;
}

// 验证整个故事信息表单
function validateStoryInfoForm() {
    // const isTitleValid = validateStoryTitle();
    // const isDescriptionValid = validateStoryDescription();
    
    // return isTitleValid && isDescriptionValid;
}

// 更新故事数据
function updateStoryData() {
    if (elements.storyTitle && elements.storyDescription) {
        storyData.title = elements.storyTitle.value;
        storyData.description = elements.storyDescription.value;
        
        updatePreview();
    }
}

// 处理封面图片上传
function handleCoverImageUpload(e) {
    const file = e.target.files[0];
    if (file && elements.coverPreview) {
        const reader = new FileReader();
        reader.onload = (event) => {
            storyData.coverImage = event.target.result;
            elements.coverPreview.innerHTML = `<img src="${storyData.coverImage}" alt="封面预览">`;
            updatePreview();
        };
        reader.readAsDataURL(file);
    }
}

// 删除节点的所有后续分支和节点
function deleteNodeBranches(node) {
    // 递归删除所有后续节点
    function deleteDescendants(targetNodeId) {
        const targetNode = storyData.nodes.find(n => n.id === targetNodeId);
        if (targetNode) {
            // 递归删除所有子节点
            targetNode.branches.forEach(branch => {
                deleteDescendants(branch.targetId);
            });
            // 从节点列表中删除
            storyData.nodes = storyData.nodes.filter(n => n.id !== targetNodeId);
        }
    }
    
    // 删除所有分支引用
    node.branches.forEach(branch => {
        deleteDescendants(branch.targetId);
    });
    
    // 清空分支
    node.branches = [];
}

// 渲染节点画布
function renderNodesCanvas() {
    if (!elements.nodesCanvas) {
        console.error('nodesCanvas元素未找到');
        return;
    }
    
    elements.nodesCanvas.innerHTML = '';
    
    console.log('开始渲染节点画布，节点数量:', storyData.nodes.length);
    
    // 绘制连接线
    storyData.nodes.forEach(node => {
        console.log(`处理节点 ${node.id}，分支数量: ${node.branches.length}`);
        
        node.branches.forEach(branch => {
            console.log(`处理分支 ${branch.id || '未知'}，目标节点ID: ${branch.targetId}`);
            
            const targetNode = storyData.nodes.find(n => n.id === branch.targetId);
            if (targetNode) {
                console.log(`找到目标节点 ${targetNode.id}，开始绘制连接线`);
                drawConnection(node, targetNode, branch);
            } else {
                console.warn(`未找到目标节点 ${branch.targetId}`);
            }
        });
    });
    
    // 绘制节点
    storyData.nodes.forEach(node => {
        console.log(`绘制节点 ${node.id}`);
        const nodeElement = createNodeElement(node);
        elements.nodesCanvas.appendChild(nodeElement);
    });
    
    // 调整画布大小以适应所有节点
    resizeCanvasToFitNodes();
    
    console.log('节点画布渲染完成');
}

// 调整画布大小以适应所有节点
function resizeCanvasToFitNodes() {
    if (storyData.nodes.length === 0) return;
    
    // 计算所有节点的边界
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    // 节点固定尺寸（与CSS中保持一致）
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 100;
    
    storyData.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + NODE_WIDTH);
        maxY = Math.max(maxY, node.y + NODE_HEIGHT);
    });
    
    // 添加边距
    const margin = 100;
    minX -= margin;
    minY -= margin;
    maxX += margin;
    maxY += margin;
    
    // 确保最小坐标不会为负数（保持画布左上角在可视区域）
    minX = Math.min(minX, 0);
    minY = Math.min(minY, 0);
    
    // 计算画布所需的尺寸
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 获取视口尺寸
    const viewportWidth = elements.nodesCanvas.clientWidth;
    const viewportHeight = elements.nodesCanvas.clientHeight;
    
    // 画布尺寸至少为视口尺寸，或内容所需尺寸（取较大值）
    const canvasWidth = Math.max(viewportWidth, contentWidth);
    const canvasHeight = Math.max(viewportHeight, contentHeight);
    
    // 设置画布尺寸
    elements.nodesCanvas.style.width = `${canvasWidth}px`;
    elements.nodesCanvas.style.height = `${canvasHeight}px`;
    
    // 确保所有节点都能被访问到，保持overflow为auto
    elements.nodesCanvas.style.overflow = 'auto';
}

// 创建节点元素
function createNodeElement(node) {
    // 根据节点类型获取CSS类名和类型文本
    const nodeType = node.type || NODE_TYPES.REGULAR;
    let typeClass, typeText;
    
    switch (nodeType) {
        case NODE_TYPES.REGULAR:
            typeClass = 'regular-node';
            typeText = '普通';
            break;
        case NODE_TYPES.BRANCH:
            typeClass = 'branch-node';
            typeText = '分支';
            break;
        case NODE_TYPES.END:
            typeClass = 'end-node';
            typeText = '结束';
            break;
        default:
            typeClass = 'regular-node';
            typeText = '普通';
    }
    
    const nodeDiv = document.createElement('div');
    nodeDiv.className = `story-node ${typeClass} ${node.id === storyData.currentNodeId ? 'selected' : ''}`;
    nodeDiv.style.left = `${node.x}px`;
    nodeDiv.style.top = `${node.y}px`;
    
    // 根节点标记
    const rootBadge = node.isRoot ? `<span class="node-type-badge root">根节点</span>` : '';
    
    nodeDiv.innerHTML = `
        <h4>
            ${node.title}
            <span class="node-type-badge ${nodeType}">${typeText}</span>
            ${rootBadge}
            <button class="btn btn-sm btn-remove" onclick="deleteNode('${node.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </h4>
    `;
    
    // 添加拖拽功能
    makeDraggable(nodeDiv, node);
    
    // 添加点击事件
    nodeDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-remove')) {
            storyData.currentNodeId = node.id;
            updatePreview();
            renderNodesCanvas();
        }
    });
    
    // 添加双击事件，打开编辑界面
    nodeDiv.addEventListener('dblclick', (e) => {
        if (!e.target.closest('.btn-remove')) {
            openNodeEditModal(node.id);
        }
    });
    
    return nodeDiv;
}

// 初始化视图平移功能
function initCanvasPan() {
    const canvas = elements.nodesCanvas;
    if (!canvas) return;
    
    let isPanning = false;
    let lastX, lastY;
    let startX, startY;
    let initialScrollLeft, initialScrollTop;
    
    // 处理画布鼠标按下事件
    canvas.addEventListener('mousedown', (e) => {
        // 只有当点击空白区域或连接线时才允许平移
        if (e.target === canvas || e.target.classList.contains('node-connector')) {
            isPanning = true;
            canvas.classList.add('dragging');
            
            // 记录初始位置
            startX = lastX = e.clientX;
            startY = lastY = e.clientY;
            initialScrollLeft = canvas.scrollLeft;
            initialScrollTop = canvas.scrollTop;
            
            // 添加动画效果
            canvas.style.transition = 'transform 0.1s ease-out';
        }
    });
    
    // 处理鼠标移动事件
    document.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        // 计算鼠标移动的距离
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        
        // 使用scrollLeft和scrollTop实现平移
        canvas.scrollLeft -= deltaX;
        canvas.scrollTop -= deltaY;
        
        lastX = e.clientX;
        lastY = e.clientY;
    });
    
    // 处理鼠标释放事件
    document.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            canvas.classList.remove('dragging');
            
            // 移除动画效果
            canvas.style.transition = '';
        }
    });
    
    // 处理鼠标离开事件
    document.addEventListener('mouseleave', () => {
        if (isPanning) {
            isPanning = false;
            canvas.classList.remove('dragging');
            
            // 移除动画效果
            canvas.style.transition = '';
        }
    });
    
    // 添加触摸支持
    canvas.addEventListener('touchstart', (e) => {
        if (e.target === canvas || e.target.classList.contains('node-connector')) {
            e.preventDefault(); // 阻止默认行为，防止页面滚动
            const touch = e.touches[0];
            isPanning = true;
            canvas.classList.add('dragging');
            
            startX = lastX = touch.clientX;
            startY = lastY = touch.clientY;
            initialScrollLeft = canvas.scrollLeft;
            initialScrollTop = canvas.scrollTop;
            
            canvas.style.transition = 'transform 0.1s ease-out';
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!isPanning) return;
        
        e.preventDefault(); // 阻止默认行为，防止页面滚动
        const touch = e.touches[0];
        
        const deltaX = touch.clientX - lastX;
        const deltaY = touch.clientY - lastY;
        
        canvas.scrollLeft -= deltaX;
        canvas.scrollTop -= deltaY;
        
        lastX = touch.clientX;
        lastY = touch.clientY;
    });
    
    canvas.addEventListener('touchend', () => {
        if (isPanning) {
            isPanning = false;
            canvas.classList.remove('dragging');
            canvas.style.transition = '';
        }
    });
    
    canvas.addEventListener('touchcancel', () => {
        if (isPanning) {
            isPanning = false;
            canvas.classList.remove('dragging');
            canvas.style.transition = '';
        }
    });
}

// 使节点可拖拽
function makeDraggable(element, node) {
    let isDragging = false;
    let offsetX, offsetY;
    
    element.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn')) return;
        
        isDragging = true;
        const rect = element.getBoundingClientRect();
        const canvasRect = elements.nodesCanvas.getBoundingClientRect();
        
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        element.style.zIndex = '100';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const canvasRect = elements.nodesCanvas.getBoundingClientRect();
        
        // 计算节点在画布中的实际位置（考虑画布滚动）
        const x = e.clientX - canvasRect.left - offsetX + elements.nodesCanvas.scrollLeft;
        const y = e.clientY - canvasRect.top - offsetY + elements.nodesCanvas.scrollTop;
        
        // 确保节点位置不为负数
        node.x = Math.max(0, x);
        node.y = Math.max(0, y);
        
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
        
        renderNodesCanvas(); // 重新渲染以更新连接线
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = '1';
        }
    });
}

// 绘制连接线
function drawConnection(sourceNode, targetNode, branch) {
    // 调试日志
    console.log(`绘制连接线: 从节点 ${sourceNode.id} 到 ${targetNode.id}`);
    console.log(`源节点坐标: (${sourceNode.x}, ${sourceNode.y})`);
    console.log(`目标节点坐标: (${targetNode.x}, ${targetNode.y})`);
    
    const connector = document.createElement('div');
    connector.className = 'node-connector';
    
    // 节点尺寸（与CSS中保持一致）
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 60; // 调整为实际视觉高度，匹配min-height: 60px
    const NODE_RADIUS = Math.min(NODE_WIDTH, NODE_HEIGHT) / 2;
    
    // 计算节点中心点
    const sourceCenter = {
        x: sourceNode.x + NODE_WIDTH / 2,
        y: sourceNode.y + NODE_HEIGHT / 2
    };
    
    const targetCenter = {
        x: targetNode.x + NODE_WIDTH / 2,
        y: targetNode.y + NODE_HEIGHT / 2
    };
    
    // 计算连接线角度
    const deltaX = targetCenter.x - sourceCenter.x;
    const deltaY = targetCenter.y - sourceCenter.y;
    const angle = Math.atan2(deltaY, deltaX);
    
    // 计算源节点的出口点（边框中点）
    let startX, startY;
    if (sourceNode.isCircle || sourceNode.shape === 'circle') {
        // 圆形节点：出口点在圆周上
        startX = sourceCenter.x + NODE_RADIUS * Math.cos(angle);
        startY = sourceCenter.y + NODE_RADIUS * Math.sin(angle);
    } else {
        // 矩形节点：根据角度确定出口边，计算边框中点
        const halfWidth = NODE_WIDTH / 2;
        const halfHeight = NODE_HEIGHT / 2;
        
        // 计算相对于源节点中心的方向向量
        const dx = deltaX / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const dy = deltaY / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 确定出口边
        if (Math.abs(dx) > Math.abs(dy)) {
            // 水平方向为主，出口在左右边
            startX = sourceCenter.x + halfWidth * Math.sign(dx);
            startY = sourceCenter.y + (halfHeight * dy / Math.abs(dx)) * Math.sign(dy);
        } else {
            // 垂直方向为主，出口在上下边
            startY = sourceCenter.y + halfHeight * Math.sign(dy);
            startX = sourceCenter.x + (halfWidth * dx / Math.abs(dy)) * Math.sign(dx);
        }
    }
    
    // 计算目标节点的入口点（边框中点）
    let endX, endY;
    const targetAngle = angle + Math.PI; // 目标节点的入口角度是源节点出口角度的反方向
    if (targetNode.isCircle || targetNode.shape === 'circle') {
        // 圆形节点：入口点在圆周上
        endX = targetCenter.x + NODE_RADIUS * Math.cos(targetAngle);
        endY = targetCenter.y + NODE_RADIUS * Math.sin(targetAngle);
    } else {
        // 矩形节点：根据角度确定入口边，计算边框中点
        const halfWidth = NODE_WIDTH / 2;
        const halfHeight = NODE_HEIGHT / 2;
        
        // 计算相对于目标节点中心的方向向量
        const dx = -deltaX / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const dy = -deltaY / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 确定入口边
        if (Math.abs(dx) > Math.abs(dy)) {
            // 水平方向为主，入口在左右边
            endX = targetCenter.x + halfWidth * Math.sign(dx);
            endY = targetCenter.y + (halfHeight * dy / Math.abs(dx)) * Math.sign(dy);
        } else {
            // 垂直方向为主，入口在上下边
            endY = targetCenter.y + halfHeight * Math.sign(dy);
            endX = targetCenter.x + (halfWidth * dx / Math.abs(dy)) * Math.sign(dx);
        }
    }
    
    console.log(`连接线坐标: 起点 (${startX}, ${startY}), 终点 (${endX}, ${endY})`);
    
    // 计算线长和最终角度
    const lineDeltaX = endX - startX;
    const lineDeltaY = endY - startY;
    const length = Math.sqrt(lineDeltaX * lineDeltaX + lineDeltaY * lineDeltaY);
    const lineAngle = Math.atan2(lineDeltaY, lineDeltaX) * 180 / Math.PI;
    
    console.log(`线长: ${length}, 角度: ${lineAngle}deg`);
    
    // 设置连接线样式
    connector.style.left = `${startX}px`;
    connector.style.top = `${startY}px`;
    connector.style.width = `${length}px`;
    connector.style.transform = `rotate(${lineAngle}deg)`;
    connector.style.backgroundColor = '#667eea';
    connector.style.height = '2px';
    connector.style.position = 'absolute';
    connector.style.zIndex = '1';
    connector.style.transformOrigin = 'left center';
    connector.style.pointerEvents = 'none'; // 防止干扰节点交互
    
    elements.nodesCanvas.appendChild(connector);
    
    // 绘制分支文本
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    const branchText = document.createElement('div');
    branchText.style.position = 'absolute';
    branchText.style.left = `${midX}px`;
    branchText.style.top = `${midY - 20}px`;
    branchText.style.transform = 'translateX(-50%)';
    branchText.style.backgroundColor = 'white';
    branchText.style.padding = '4px 8px';
    branchText.style.borderRadius = '4px';
    branchText.style.fontSize = '12px';
    branchText.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    branchText.style.zIndex = '50';
    branchText.style.pointerEvents = 'none'; // 防止干扰节点交互
    branchText.textContent = branch.text;
    
    elements.nodesCanvas.appendChild(branchText);
}

// 添加分支
function addBranch() {
    const currentNode = storyData.nodes.find(n => n.id === storyData.currentNodeId);
    if (!currentNode) {
        alert('请先选择一个节点');
        return;
    }
    
    // 检查当前节点是否有类型，如果没有则默认为regular
    if (!currentNode.type) {
        currentNode.type = NODE_TYPES.REGULAR;
    }
    
    // 1. 权限验证：检查当前节点是否具备添加后继节点的权限
    if (currentNode.type === NODE_TYPES.END) {
        alert('结束节点不能创建后续节点');
        return;
    }
    
    // 2. 检查当前节点是否为regular节点，只能有一个后续节点
    if (currentNode.type === NODE_TYPES.REGULAR && currentNode.branches.length >= 1) {
        alert('普通节点只能创建一个后续节点');
        return;
    }
    
    // 3. 获取分支文本
    const branchText = elements.branchText.value.trim();
    if (!branchText) {
        alert('请输入分支文本');
        return;
    }
    
    // 4. 获取用户选择的新节点类型
    const newNodeType = elements.newNodeType ? elements.newNodeType.value : NODE_TYPES.REGULAR;
    
    // 5. 获取用户输入的节点标题和内容
    const newNodeTitle = elements.branchNodeTitle ? elements.branchNodeTitle.value.trim() : getDefaultNodeTitle(newNodeType);
    const newNodeContent = elements.branchNodeContent ? elements.branchNodeContent.value.trim() : getDefaultNodeContent(newNodeType);
    
    // 使用默认值作为备选
    const finalTitle = newNodeTitle || getDefaultNodeTitle(newNodeType);
    const finalContent = newNodeContent || getDefaultNodeContent(newNodeType);
    
    // 6. 创建新节点作为分支目标，使用用户选择的类型和输入的内容
    // 智能定位：避免节点重叠
    const newNodeX = currentNode.x + 200;
    let newNodeY = currentNode.y;
    
    // 节点固定尺寸（与CSS中保持一致）
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 100;
    const NODE_SPACING = 20; // 节点间距
    
    // 检查是否与现有节点重叠，如果重叠则向下调整
    let isOverlapping = true;
    let overlapCheckCount = 0;
    const maxChecks = 20; // 最大检查次数，防止无限循环
    
    while (isOverlapping && overlapCheckCount < maxChecks) {
        isOverlapping = false;
        
        for (const node of storyData.nodes) {
            // 检查边界重叠
            if (node.x < newNodeX + NODE_WIDTH &&
                node.x + NODE_WIDTH > newNodeX &&
                node.y < newNodeY + NODE_HEIGHT &&
                node.y + NODE_HEIGHT > newNodeY) {
                
                // 重叠，向下调整位置
                newNodeY = node.y + NODE_HEIGHT + NODE_SPACING;
                isOverlapping = true;
                break;
            }
        }
        
        overlapCheckCount++;
    }
    
    const newNode = {
        id: generateId(),
        title: finalTitle,
        content: finalContent,
        media: [],
        branches: [],
        x: newNodeX,
        y: newNodeY,
        type: newNodeType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // 7. 创建分支关系
    const branch = {
        id: generateId(),
        text: branchText,
        targetId: newNode.id
    };
    
    // 8. 添加到数据模型
    currentNode.branches.push(branch);
    storyData.nodes.push(newNode);
    
    // 9. 清空分支表单
    elements.branchText.value = '';
    if (elements.newNodeType) {
        elements.newNodeType.value = NODE_TYPES.REGULAR; // 重置为默认值
    }
    if (elements.branchNodeTitle) {
        elements.branchNodeTitle.value = '';
    }
    if (elements.branchNodeContent) {
        elements.branchNodeContent.value = '';
    }
    
    // 10. 更新UI
    renderNodesCanvas();
    updatePreview();
}

// 获取默认节点标题
function getDefaultNodeTitle(type) {
    switch (type) {
        case NODE_TYPES.REGULAR:
            return '普通节点';
        case NODE_TYPES.BRANCH:
            return '分支节点';
        case NODE_TYPES.END:
            return '结束节点';
        default:
            return '新节点';
    }
}

// 获取默认节点内容
function getDefaultNodeContent(type) {
    switch (type) {
        case NODE_TYPES.REGULAR:
            return '普通节点内容...';
        case NODE_TYPES.BRANCH:
            return '分支节点内容...从这里可以创建多个分支路径。';
        case NODE_TYPES.END:
            return '故事结束。';
        default:
            return '节点内容...';
    }
}

// 删除节点
function deleteNode(nodeId) {
    const node = storyData.nodes.find(n => n.id === nodeId);
    
    // 1. 根节点保护机制：防止删除根节点
    if (node && node.isRoot) {
        alert('根节点不能被删除');
        return;
    }
    
    if (confirm('确定要删除这个节点吗？这将同时删除所有连接到它的分支。')) {
        // 删除节点
        storyData.nodes = storyData.nodes.filter(n => n.id !== nodeId);
        
        // 删除所有指向该节点的分支
        storyData.nodes.forEach(n => {
            n.branches = n.branches.filter(branch => branch.targetId !== nodeId);
        });
        
        // 更新当前节点
        if (storyData.currentNodeId === nodeId) {
            storyData.currentNodeId = storyData.nodes.length > 0 ? storyData.nodes[0].id : null;
        }
        
        renderNodesCanvas();
        updatePreview();
    }
}

// 全局变量：当前编辑的节点ID
let currentEditingNodeId = null;

// 打开节点编辑模态框
function openNodeEditModal(nodeId) {
    // 检查是否已经在编辑其他节点
    if (currentEditingNodeId) {
        alert('请先完成当前节点的编辑');
        return;
    }
    
    // 查找节点
    const node = storyData.nodes.find(n => n.id === nodeId);
    if (!node) {
        alert('节点不存在');
        return;
    }
    
    // 标记当前编辑的节点
    currentEditingNodeId = nodeId;
    
    // 加载节点数据到编辑界面
    elements.nodeEditTitle.value = node.title;
    elements.nodeEditContent.value = node.content;
    
    // 清除错误信息
    elements.nodeEditError.style.display = 'none';
    
    // 打开模态框
    elements.nodeEditModal.classList.add('show');
    
    // 添加动画效果
    elements.nodeEditModal.style.animation = 'fadeIn 0.3s ease';
    
    // 自动聚焦到标题输入框
    setTimeout(() => {
        elements.nodeEditTitle.focus();
        elements.nodeEditTitle.select();
    }, 100);
}

// 关闭节点编辑模态框
function closeNodeEditModal() {
    // 重置当前编辑节点
    currentEditingNodeId = null;
    
    // 清除错误信息
    elements.nodeEditError.style.display = 'none';
    
    // 关闭模态框
    elements.nodeEditModal.classList.remove('show');
    elements.nodeEditModal.style.animation = '';
}

// 保存节点编辑
function saveNodeEdit() {
    // 检查是否有正在编辑的节点
    if (!currentEditingNodeId) {
        alert('没有正在编辑的节点');
        return;
    }
    
    // 查找节点
    const node = storyData.nodes.find(n => n.id === currentEditingNodeId);
    if (!node) {
        alert('节点不存在');
        closeNodeEditModal();
        return;
    }
    
    // 获取编辑数据
    const title = elements.nodeEditTitle.value.trim();
    const content = elements.nodeEditContent.value.trim();
    
    // 验证输入数据
    if (!title) {
        showNodeEditError('节点标题不能为空');
        return;
    }
    
    if (!content) {
        showNodeEditError('节点内容不能为空');
        return;
    }
    
    // 保存数据
    node.title = title;
    node.content = content;
    node.updatedAt = new Date().toISOString();
    
    // 关闭编辑模态框
    closeNodeEditModal();
    
    // 更新显示
    renderNodesCanvas();
    updatePreview();
    
    // 添加保存成功的视觉反馈
    showNodeEditSuccess('节点保存成功');
}

// 显示节点编辑错误信息
function showNodeEditError(message) {
    elements.nodeEditError.textContent = message;
    elements.nodeEditError.style.display = 'block';
    
    // 添加错误动画
    elements.nodeEditError.style.animation = 'fadeIn 0.3s ease';
    
    // 自动滚动到错误信息
    elements.nodeEditError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 显示节点编辑成功信息
function showNodeEditSuccess(message) {
    // 创建临时成功提示元素
    const successElement = document.createElement('div');
    successElement.className = 'auto-save-indicator';
    successElement.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successElement.style.backgroundColor = '#10b981';
    successElement.style.color = 'white';
    successElement.style.padding = '0.75rem 1.5rem';
    successElement.style.borderRadius = '25px';
    successElement.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    successElement.style.display = 'flex';
    successElement.style.alignItems = 'center';
    successElement.style.gap = '0.5rem';
    successElement.style.opacity = '0';
    successElement.style.transform = 'translateY(20px)';
    successElement.style.transition = 'all 0.3s ease';
    successElement.style.zIndex = '1000';
    successElement.style.position = 'fixed';
    successElement.style.bottom = '20px';
    successElement.style.right = '20px';
    
    // 添加到页面
    document.body.appendChild(successElement);
    
    // 显示动画
    setTimeout(() => {
        successElement.style.opacity = '1';
        successElement.style.transform = 'translateY(0)';
    }, 100);
    
    // 3秒后自动隐藏
    setTimeout(() => {
        successElement.style.opacity = '0';
        successElement.style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.body.removeChild(successElement);
        }, 300);
    }, 3000);
}

// 打开角色创建模态框
function openCharacterModal() {
    elements.characterModal.classList.add('show');
    // 清空表单
    document.getElementById('characterName').value = '';
    document.getElementById('characterDescription').value = '';
    
    // 重置属性列表
    elements.characterAttributes.innerHTML = `
        <div class="attribute-item">
            <input type="text" placeholder="属性名称" class="form-control attribute-name">
            <input type="number" placeholder="值" class="form-control attribute-value">
            <button class="btn btn-remove" onclick="removeAttributeField(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// 关闭角色创建/编辑模态框
function closeCharacterModal() {
    elements.characterModal.classList.remove('show');
    
    // 清空表单
    elements.characterId.value = '';
    elements.characterName.value = '';
    elements.characterDescription.value = '';
    elements.characterError.style.display = 'none';
    
    // 恢复模态框标题
    elements.characterModalTitle.innerHTML = '<i class="fas fa-user-plus"></i> 创建角色';
}

// 打开角色编辑模态框
function openCharacterEditModal(characterId) {
    // 查找角色
    const character = storyData.characters.find(c => c.id === characterId);
    if (!character) {
        alert('角色不存在');
        return;
    }
    
    // 填充表单数据
    elements.characterId.value = character.id;
    elements.characterName.value = character.name;
    elements.characterDescription.value = character.description;
    
    // 清除错误信息
    elements.characterError.style.display = 'none';
    
    // 更新模态框标题
    elements.characterModalTitle.innerHTML = '<i class="fas fa-edit"></i> 编辑角色';
    
    // 打开模态框
    elements.characterModal.classList.add('show');
    
    // 自动聚焦到角色名称输入框
    setTimeout(() => {
        elements.characterName.focus();
        elements.characterName.select();
    }, 100);
}

// 保存角色
function saveCharacter() {
    const characterId = elements.characterId.value.trim();
    const name = elements.characterName.value.trim();
    
    // 验证输入
    if (!name) {
        showCharacterError('角色名称不能为空');
        return;
    }
    
    // 只保留角色名称和描述
    const characterData = {
        name: name,
        description: elements.characterDescription.value.trim()
    };
    
    let successMessage = '';
    
    if (characterId) {
        // 编辑现有角色
        const characterIndex = storyData.characters.findIndex(c => c.id === characterId);
        if (characterIndex !== -1) {
            // 更新现有角色
            storyData.characters[characterIndex] = {
                ...storyData.characters[characterIndex],
                ...characterData,
                updatedAt: new Date().toISOString()
            };
            successMessage = '角色更新成功';
        }
    } else {
        // 创建新角色
        const newCharacter = {
            id: generateId(),
            ...characterData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        storyData.characters.push(newCharacter);
        successMessage = '角色创建成功';
    }
    
    // 更新角色列表
    renderCharactersList();
    
    // 关闭模态框
    closeCharacterModal();
    
    // 显示成功消息
    showCharacterSuccess(successMessage);
    
    updatePreview();
}

// 显示角色操作错误信息
function showCharacterError(message) {
    elements.characterError.textContent = message;
    elements.characterError.style.display = 'block';
    elements.characterError.style.animation = 'fadeIn 0.3s ease';
    
    // 自动滚动到错误信息
    elements.characterError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 显示角色操作成功信息
function showCharacterSuccess(message) {
    // 创建临时成功提示元素
    const successElement = document.createElement('div');
    successElement.className = 'auto-save-indicator';
    successElement.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successElement.style.backgroundColor = '#10b981';
    successElement.style.color = 'white';
    successElement.style.padding = '0.75rem 1.5rem';
    successElement.style.borderRadius = '25px';
    successElement.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    successElement.style.display = 'flex';
    successElement.style.alignItems = 'center';
    successElement.style.gap = '0.5rem';
    successElement.style.opacity = '0';
    successElement.style.transform = 'translateY(20px)';
    successElement.style.transition = 'all 0.3s ease';
    successElement.style.zIndex = '1000';
    successElement.style.position = 'fixed';
    successElement.style.bottom = '20px';
    successElement.style.right = '20px';
    
    // 添加到页面
    document.body.appendChild(successElement);
    
    // 显示动画
    setTimeout(() => {
        successElement.style.opacity = '1';
        successElement.style.transform = 'translateY(0)';
    }, 100);
    
    // 3秒后自动隐藏
    setTimeout(() => {
        successElement.style.opacity = '0';
        successElement.style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.body.removeChild(successElement);
        }, 300);
    }, 3000);
}

// 渲染角色列表
function renderCharactersList() {
    elements.charactersList.innerHTML = '';
    
    storyData.characters.forEach(character => {
        const characterElement = document.createElement('div');
        characterElement.className = 'character-item';
        
        characterElement.innerHTML = `
            <h4>
                ${character.name}
                <div class="character-actions">
                    <button class="btn btn-sm btn-primary" onclick="openCharacterEditModal('${character.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-remove" onclick="deleteCharacter('${character.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </h4>
            <p>${character.description || '无描述'}</p>
        `;
        
        elements.charactersList.appendChild(characterElement);
    });
}

// 删除角色
function deleteCharacter(characterId) {
    if (confirm('确定要删除这个角色吗？')) {
        storyData.characters = storyData.characters.filter(char => char.id !== characterId);
        renderCharactersList();
        updatePreview();
        scheduleAutoSave();
    }
}

// 切换预览面板
function togglePreviewPanel() {
    elements.previewPanel.classList.toggle('hidden');
    elements.previewToggle.innerHTML = elements.previewPanel.classList.contains('hidden') ? 
        '<i class="fas fa-eye"></i> 显示预览' : '<i class="fas fa-eye-slash"></i> 隐藏预览';
}

// 更新预览内容
function updatePreview() {
    if (elements.previewPanel.classList.contains('hidden')) return;
    
    const currentNode = storyData.nodes.find(n => n.id === storyData.currentNodeId);
    if (!currentNode) {
        elements.previewContent.innerHTML = `
            <div class="preview-placeholder">
                <h3>故事预览</h3>
                <p>选择一个节点开始预览你的故事</p>
            </div>
        `;
        return;
    }
    
    // 生成预览HTML
    let previewHtml = `
        <div class="preview-story-info">
            <h2>${storyData.title || '未命名故事'}</h2>
            <p class="preview-description">${storyData.description || '无描述'}</p>
        </div>
        
        <div class="preview-node">
            <h3>${currentNode.title}</h3>
            <div class="preview-content-text">${currentNode.content}</div>
        </div>
    `;
    
    // 添加分支选项
    if (currentNode.branches.length > 0) {
        previewHtml += `<div class="preview-branches"><h4>选择你的行动：</h4>`;
        currentNode.branches.forEach(branch => {
            previewHtml += `<div class="preview-branch-option">${branch.text}</div>`;
        });
        previewHtml += `</div>`;
    }
    
    elements.previewContent.innerHTML = previewHtml;
}

// 保存故事到数据库
function saveStory() {
    // 显示保存中状态
    showSaveStatus('保存中...', 'pending');
    
    // 数据验证
    const validationErrors = validateStoryData(storyData);
    if (validationErrors.length > 0) {
        showSaveStatus('保存失败：数据验证错误', 'error');
        showValidationErrors(validationErrors);
        return;
    }
    
    // 准备保存的数据格式，转换为后端需要的格式
    const saveData = prepareSaveData(storyData);
    
    // 发送请求到后端API（通过Vite代理）
    fetch('/api/stories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || '保存失败');
            });
        }
        return response.json();
    })
    .then(data => {
        showSaveStatus('保存成功', 'success');
        // 更新本地故事ID
        if (data.data && data.data.id) {
            storyData.id = data.data.id;
        }
    })
    .catch(error => {
        console.error('保存失败:', error);
        showSaveStatus('保存失败：' + error.message, 'error');
    });
}

// 准备保存到后端的数据格式
function prepareSaveData(storyData) {
    // 转换为后端需要的格式
    const saveData = {
        title: storyData.title,
        description: storyData.description,
        cover_image: storyData.coverImage || null,
        nodes: [],
        characters: [],
        branches: []
    };
    
    // 转换节点数据
    storyData.nodes.forEach(node => {
        saveData.nodes.push({
            id: node.id,
            title: node.title,
            content: node.content,
            type: node.type || 'regular',
            x: node.x,
            y: node.y,
            is_root: node.isRoot || false,
            media: node.media || []
        });
        
        // 转换分支数据
        node.branches.forEach(branch => {
            saveData.branches.push({
                id: branch.id,
                source_node_id: node.id,
                target_node_id: branch.targetId,
                context: branch.text
            });
        });
    });
    
    // 转换角色数据
    storyData.characters.forEach(character => {
        saveData.characters.push({
            id: character.id,
            name: character.name,
            description: character.description || ''
        });
    });
    
    return saveData;
}

// 验证故事数据
function validateStoryData(storyData) {
    const errors = [];
    
    // 验证故事基本信息
    if (!storyData.title || storyData.title.trim() === '') {
        errors.push('故事标题不能为空');
    }
    
    if (!storyData.description || storyData.description.trim() === '') {
        errors.push('故事描述不能为空');
    }
    
    // 验证节点数据
    if (storyData.nodes.length === 0) {
        errors.push('故事至少需要一个节点');
    } else {
        // 验证根节点
        const rootNodes = storyData.nodes.filter(node => node.isRoot);
        if (rootNodes.length === 0) {
            errors.push('故事必须有一个根节点');
        } else if (rootNodes.length > 1) {
            errors.push('故事只能有一个根节点');
        }
        
        // 验证每个节点
        storyData.nodes.forEach(node => {
            if (!node.title || node.title.trim() === '') {
                errors.push(`节点 ${node.id} 的标题不能为空`);
            }
            
            if (!node.content || node.content.trim() === '') {
                errors.push(`节点 ${node.id} 的内容不能为空`);
            }
            
            if (typeof node.x !== 'number' || typeof node.y !== 'number') {
                errors.push(`节点 ${node.id} 的位置坐标无效`);
            }
            
            // 验证分支
            node.branches.forEach(branch => {
                if (!branch.text || branch.text.trim() === '') {
                    errors.push(`节点 ${node.id} 的分支文本不能为空`);
                }
                
                if (!branch.targetId) {
                    errors.push(`节点 ${node.id} 的分支目标ID无效`);
                }
            });
        });
    }
    
    // 验证角色数据
    storyData.characters.forEach(character => {
        if (!character.name || character.name.trim() === '') {
            errors.push(`角色 ${character.id} 的名称不能为空`);
        }
    });
    
    return errors;
}

// 显示保存状态
function showSaveStatus(message, status) {
    // 创建或获取保存状态指示器
    let statusIndicator = document.getElementById('saveStatus');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'saveStatus';
        statusIndicator.className = 'save-status-indicator';
        document.body.appendChild(statusIndicator);
    }
    
    // 设置状态样式
    statusIndicator.className = `save-status-indicator ${status}`;
    
    // 设置状态图标
    let icon = '';
    switch (status) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'pending':
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            break;
    }
    
    // 设置状态消息
    statusIndicator.innerHTML = `${icon} ${message}`;
    statusIndicator.style.display = 'flex';
    
    // 自动隐藏成功消息
    if (status === 'success') {
        setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 3000);
    }
}

// 显示验证错误
function showValidationErrors(errors) {
    // 创建或获取错误容器
    let errorContainer = document.getElementById('validationErrors');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'validationErrors';
        errorContainer.className = 'validation-errors';
        document.body.appendChild(errorContainer);
    }
    
    // 设置错误内容
    let errorHtml = '<h3>数据验证错误：</h3><ul>';
    errors.forEach(error => {
        errorHtml += `<li>${error}</li>`;
    });
    errorHtml += '</ul>';
    
    errorContainer.innerHTML = errorHtml;
    errorContainer.style.display = 'block';
    
    // 自动滚动到错误容器
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 3秒后自动隐藏
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

// 导出故事数据
function exportStoryData() {
    const dataStr = JSON.stringify(storyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${storyData.title || 'story'}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
