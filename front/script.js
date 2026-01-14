// 故事数据模型
let storyData = {
    title: '',
    description: '',
    coverImage: null,
    nodes: [],
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
async function initApp() {
    // 根据用户角色更新导航栏
    if (typeof updateNavigationByRole === 'function') {
        setTimeout(updateNavigationByRole, 300);
    }
    
    // 获取DOM元素
    getElements();
    
    // 绑定事件监听
    bindEvents();
    
    // 加载分类列表（等待完成，确保分类选项已加载）
    await loadCategories();
    
    // 检查URL参数中是否有storyId（编辑模式）
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('story');
    
    if (storyId) {
        // 编辑模式：加载现有故事数据
        console.log('检测到编辑模式，故事ID:', storyId);
        try {
            await loadStoryForEditing(storyId);
            // 加载完成后渲染画布（不启用自动布局，使用保存的位置）
            renderNodesCanvas(false);
            updateNodePreview();
        } catch (error) {
            console.error('加载故事数据失败:', error);
            showSaveStatus('加载故事失败: ' + error.message, 'error');
            // 如果加载失败，创建新故事
            if (storyData.nodes.length === 0) {
                createInitialNode();
            }
        }
    } else {
        // 创建模式：创建初始节点（如果没有节点）
        if (storyData.nodes.length === 0) {
            createInitialNode();
        } else {
            renderNodesCanvas();
            updateNodePreview();
        }
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
        storyCategory: document.getElementById('storyCategory'),
        storyInfoForm: document.getElementById('storyInfoForm'),
        coverImage: document.getElementById('coverImage'),
        coverPreview: document.getElementById('coverPreview'),
        titleError: document.getElementById('titleError'),
        descriptionError: document.getElementById('descriptionError'),
        categoryError: document.getElementById('categoryError'),
        
    
        
        // 分支管理
        addBranchBtn: document.getElementById('addBranchBtn'),
        nodesCanvas: document.getElementById('nodesCanvas'),
        branchText: document.getElementById('branchText'),
        newNodeType: document.getElementById('newNodeType'),
        branchNodeTitle: document.getElementById('branchNodeTitle'),
        branchNodeContent: document.getElementById('branchNodeContent'),
        
        // 节点编辑
        nodeEditModal: document.getElementById('nodeEditModal'),
        closeNodeEditModal: document.getElementById('closeNodeEditModal'),
        cancelNodeEditBtn: document.getElementById('cancelNodeEditBtn'),
        saveNodeEditBtn: document.getElementById('saveNodeEditBtn'),
        nodeEditTitle: document.getElementById('nodeEditTitle'),
        nodeEditContent: document.getElementById('nodeEditContent'),
        nodeEditError: document.getElementById('nodeEditError'),
        aiPolishBtn: document.getElementById('aiPolishBtn'),
        aiGeneratedContent: document.getElementById('aiGeneratedContent'),
        useAiContentBtn: document.getElementById('useAiContentBtn'),
        copyAiContentBtn: document.getElementById('copyAiContentBtn'),
        
        // 节点预览
        nodePreviewTitle: document.getElementById('nodePreviewTitle'),
        nodePreviewContent: document.getElementById('nodePreviewContent'),
        editNodeBtn: document.getElementById('editNodeBtn'),
        
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
    
    // 故事信息表单提交事件（已禁用，使用实时验证）
    // if (elements.storyInfoForm) {
    //     elements.storyInfoForm.addEventListener('submit', (e) => {
    //         e.preventDefault();
    //     });
    // }
    
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
    if (elements.aiPolishBtn) {
        elements.aiPolishBtn.addEventListener('click', polishNodeContentWithAI);
    }
    if (elements.useAiContentBtn) {
        elements.useAiContentBtn.addEventListener('click', useAiGeneratedContent);
    }
    if (elements.copyAiContentBtn) {
        elements.copyAiContentBtn.addEventListener('click', copyAiGeneratedContent);
    }
    if (elements.editNodeBtn) {
        elements.editNodeBtn.addEventListener('click', () => {
            if (storyData.currentNodeId) {
                openNodeEditModal(storyData.currentNodeId);
            } else {
                alert('请先选择一个节点');
            }
        });
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
    updateNodePreview();
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

// 更新故事数据
function updateStoryData() {
    if (elements.storyTitle && elements.storyDescription) {
        storyData.title = elements.storyTitle.value;
        storyData.description = elements.storyDescription.value;
        
        updateNodePreview();
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
            updateNodePreview();
        };
        reader.readAsDataURL(file);
    }
}

// 渲染节点画布
function renderNodesCanvas(shouldAutoLayout = false) {
    if (!elements.nodesCanvas) {
        console.error('nodesCanvas元素未找到');
        return;
    }
    
    // 保存当前滚动位置
    const savedScrollLeft = elements.nodesCanvas.scrollLeft;
    const savedScrollTop = elements.nodesCanvas.scrollTop;
    
    elements.nodesCanvas.innerHTML = '';
    
    console.log('开始渲染节点画布，节点数量:', storyData.nodes.length);
    
    // 如果需要自动布局（例如加载新故事时），先进行布局
    if (shouldAutoLayout) {
        const NODE_WIDTH = 180;
        const NODE_HEIGHT = 100;
        const NODE_SPACING = 30;
        autoLayoutNodes(NODE_WIDTH, NODE_HEIGHT, NODE_SPACING);
    }
    
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
    
    // 恢复滚动位置（如果画布大小没有变化太大）
    const newScrollLeft = Math.min(savedScrollLeft, elements.nodesCanvas.scrollWidth - elements.nodesCanvas.clientWidth);
    const newScrollTop = Math.min(savedScrollTop, elements.nodesCanvas.scrollHeight - elements.nodesCanvas.clientHeight);
    elements.nodesCanvas.scrollLeft = newScrollLeft;
    elements.nodesCanvas.scrollTop = newScrollTop;
    
    console.log('节点画布渲染完成');
}

// 调整画布大小以适应所有节点，并确保节点不互相遮挡
function resizeCanvasToFitNodes() {
    if (storyData.nodes.length === 0) {
        // 如果没有节点，设置默认画布大小
        const viewportWidth = elements.nodesCanvas?.clientWidth || 800;
        const viewportHeight = elements.nodesCanvas?.clientHeight || 600;
        if (elements.nodesCanvas) {
            elements.nodesCanvas.style.width = `${viewportWidth}px`;
            elements.nodesCanvas.style.height = `${viewportHeight}px`;
        }
        return;
    }
    
    // 节点固定尺寸（与CSS中保持一致）
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 100;
    
    // 计算所有节点的边界
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    storyData.nodes.forEach(node => {
        // 确保节点有位置信息
        if (node.x === undefined || node.x === null) node.x = 100;
        if (node.y === undefined || node.y === null) node.y = 100;
        
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + NODE_WIDTH);
        maxY = Math.max(maxY, node.y + NODE_HEIGHT);
    });
    
    // 添加边距，确保节点不会紧贴画布边缘，并且可以滚动查看
    const margin = 200;
    minX = Math.min(minX - margin, 0);
    minY = Math.min(minY - margin, 0);
    maxX += margin;
    maxY += margin;
    
    // 计算画布所需的尺寸
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 获取视口尺寸（可见区域）
    const viewportWidth = elements.nodesCanvas?.clientWidth || 800;
    const viewportHeight = elements.nodesCanvas?.clientHeight || 600;
    
    // 画布尺寸至少为视口尺寸，或内容所需尺寸（取较大值）
    // 确保画布足够大以容纳所有节点
    const canvasWidth = Math.max(viewportWidth, contentWidth);
    const canvasHeight = Math.max(viewportHeight, contentHeight);
    
    // 设置画布尺寸
    if (elements.nodesCanvas) {
        // 设置画布内容区域的大小（这是实际可滚动的内容大小）
        // 注意：这里设置的是画布内容的大小，不是容器的大小
        elements.nodesCanvas.style.width = `${canvasWidth}px`;
        elements.nodesCanvas.style.height = `${canvasHeight}px`;
        
        // 确保所有节点都能被访问到，保持overflow为auto以支持滚动
        elements.nodesCanvas.style.overflow = 'auto';
        elements.nodesCanvas.style.overflowX = 'auto';
        elements.nodesCanvas.style.overflowY = 'auto';
        
        // 调试信息（仅在开发时使用）
        if (canvasHeight > viewportHeight) {
            console.log('画布尺寸设置（可垂直滚动）:', {
                canvasWidth,
                canvasHeight,
                viewportWidth,
                viewportHeight,
                scrollWidth: elements.nodesCanvas.scrollWidth,
                scrollHeight: elements.nodesCanvas.scrollHeight,
                clientWidth: elements.nodesCanvas.clientWidth,
                clientHeight: elements.nodesCanvas.clientHeight,
                canScrollVertically: canvasHeight > viewportHeight
            });
        }
    }
}

// 自动布局节点，避免重叠
function autoLayoutNodes(NODE_WIDTH, NODE_HEIGHT, NODE_SPACING) {
    if (storyData.nodes.length === 0) return;
    
    // 找到根节点
    const rootNode = storyData.nodes.find(n => n.isRoot) || storyData.nodes[0];
    if (!rootNode) return;
    
    // 使用广度优先搜索布局节点
    const visited = new Set();
    const queue = [{ node: rootNode, x: 100, y: 100 }];
    visited.add(rootNode.id);
    
    // 设置根节点位置
    rootNode.x = 100;
    rootNode.y = 100;
    
    // 用于跟踪每行的最大Y坐标
    const rowMaxY = {};
    
    while (queue.length > 0) {
        const { node, x, y } = queue.shift();
        
        // 更新节点位置
        node.x = x;
        node.y = y;
        
        // 记录当前行的最大Y坐标
        const rowKey = Math.floor(y / (NODE_HEIGHT + NODE_SPACING));
        if (!rowMaxY[rowKey]) {
            rowMaxY[rowKey] = y + NODE_HEIGHT;
        } else {
            rowMaxY[rowKey] = Math.max(rowMaxY[rowKey], y + NODE_HEIGHT);
        }
        
        // 处理当前节点的所有分支
        if (node.branches && node.branches.length > 0) {
            const branchCount = node.branches.length;
            const startX = x + NODE_WIDTH + NODE_SPACING * 2; // 下一列的位置
            
            // 计算下一行的Y坐标（使用当前行的最大Y + 间距）
            const nextRowY = (rowMaxY[rowKey] || y + NODE_HEIGHT) + NODE_SPACING;
            
            node.branches.forEach((branch, index) => {
                const targetNode = storyData.nodes.find(n => n.id === branch.targetId);
                if (targetNode && !visited.has(targetNode.id)) {
                    visited.add(targetNode.id);
                    
                    // 计算目标节点的Y坐标（垂直排列）
                    const targetY = nextRowY + index * (NODE_HEIGHT + NODE_SPACING);
                    
                    // 检查是否与现有节点重叠
                    let finalX = startX;
                    let finalY = targetY;
                    let isOverlapping = true;
                    let overlapCheckCount = 0;
                    const maxChecks = 50;
                    
                    while (isOverlapping && overlapCheckCount < maxChecks) {
                        isOverlapping = false;
                        
                        for (const existingNode of storyData.nodes) {
                            if (existingNode.id === targetNode.id) continue;
                            
                            // 检查边界重叠
                            if (existingNode.x < finalX + NODE_WIDTH &&
                                existingNode.x + NODE_WIDTH > finalX &&
                                existingNode.y < finalY + NODE_HEIGHT &&
                                existingNode.y + NODE_HEIGHT > finalY) {
                                
                                // 重叠，向右移动
                                finalX = existingNode.x + NODE_WIDTH + NODE_SPACING;
                                isOverlapping = true;
                                break;
                            }
                        }
                        
                        overlapCheckCount++;
                    }
                    
                    queue.push({ node: targetNode, x: finalX, y: finalY });
                }
            });
        }
    }
    
    // 对于没有被访问到的节点（孤立节点），放置在右侧
    let orphanX = 500;
    let orphanY = 100;
    
    storyData.nodes.forEach(node => {
        if (!visited.has(node.id)) {
            // 检查是否重叠
            let finalX = orphanX;
            let finalY = orphanY;
            let isOverlapping = true;
            let overlapCheckCount = 0;
            const maxChecks = 50;
            
            while (isOverlapping && overlapCheckCount < maxChecks) {
                isOverlapping = false;
                
                for (const existingNode of storyData.nodes) {
                    if (existingNode.id === node.id) continue;
                    
                    if (existingNode.x < finalX + NODE_WIDTH &&
                        existingNode.x + NODE_WIDTH > finalX &&
                        existingNode.y < finalY + NODE_HEIGHT &&
                        existingNode.y + NODE_HEIGHT > finalY) {
                        
                        finalY = existingNode.y + NODE_HEIGHT + NODE_SPACING;
                        isOverlapping = true;
                        break;
                    }
                }
                
                overlapCheckCount++;
            }
            
            node.x = finalX;
            node.y = finalY;
            orphanY = finalY + NODE_HEIGHT + NODE_SPACING;
        }
    });
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
            updateNodePreview();
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
        // 检查是否点击了节点（节点有自己的拖拽处理，不应该触发画布平移）
        const clickedNode = e.target.closest('.story-node');
        if (clickedNode) {
            return; // 让节点处理自己的拖拽
        }
        
        // 检查是否点击了按钮
        if (e.target.closest('.btn')) {
            return; // 按钮点击不应该触发画布平移
        }
        
        // 允许在空白区域、连接线、分支文本上拖动画布
        // 如果点击的是画布本身，或者点击的是连接线/分支文本，都可以拖动画布
        const isCanvasBackground = e.target === canvas || 
                                   e.target.classList.contains('node-connector') ||
                                   e.target.classList.contains('branch-text');
        
        // 如果点击的不是节点、按钮，且是画布内的元素，也允许拖动画布
        // 这样可以处理点击空白区域的情况
        const isInsideCanvas = canvas.contains(e.target);
        const isNotInteractive = !e.target.closest('.story-node') && 
                                !e.target.closest('.btn') &&
                                !e.target.closest('input') &&
                                !e.target.closest('select') &&
                                !e.target.closest('textarea');
        
        if (isCanvasBackground || (isInsideCanvas && isNotInteractive)) {
            isPanning = true;
            canvas.classList.add('dragging');
            
            // 记录初始位置
            startX = lastX = e.clientX;
            startY = lastY = e.clientY;
            initialScrollLeft = canvas.scrollLeft;
            initialScrollTop = canvas.scrollTop;
            
            // 禁用文本选择，提升拖动体验
            canvas.style.userSelect = 'none';
            canvas.style.cursor = 'grabbing';
            
            // 阻止默认行为，防止文本选择和页面滚动
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    // 处理鼠标移动事件
    document.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        // 计算鼠标移动的距离
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        
        // 如果移动距离太小，忽略（避免微小抖动）
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
            return;
        }
        
        // 使用scrollLeft和scrollTop实现平移（支持水平和垂直滚动）
        const newScrollLeft = canvas.scrollLeft - deltaX;
        const newScrollTop = canvas.scrollTop - deltaY;
        
        // 计算最大滚动值
        const maxScrollLeft = Math.max(0, canvas.scrollWidth - canvas.clientWidth);
        const maxScrollTop = Math.max(0, canvas.scrollHeight - canvas.clientHeight);
        
        // 确保滚动值在有效范围内
        // 注意：如果 maxScrollTop 为 0 或负数，说明内容高度不够，无法滚动
        if (maxScrollTop > 0) {
            canvas.scrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
        } else {
            // 如果无法滚动，至少尝试设置值（可能内容高度还没计算好）
            canvas.scrollTop = Math.max(0, newScrollTop);
        }
        
        if (maxScrollLeft > 0) {
            canvas.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));
        } else {
            canvas.scrollLeft = Math.max(0, newScrollLeft);
        }
        
        lastX = e.clientX;
        lastY = e.clientY;
        
        // 阻止默认行为，防止页面滚动和文本选择
        e.preventDefault();
        e.stopPropagation();
    });
    
    // 处理鼠标释放事件
    document.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            canvas.classList.remove('dragging');
            
            // 恢复样式
            canvas.style.userSelect = '';
            canvas.style.cursor = 'grab';
        }
    });
    
    // 处理鼠标离开事件
    canvas.addEventListener('mouseleave', () => {
        if (isPanning) {
            isPanning = false;
            canvas.classList.remove('dragging');
            
            // 恢复样式
            canvas.style.userSelect = '';
            canvas.style.cursor = 'grab';
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
    let draggedNodeId = null;
    
    element.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn')) return;
        
        // 阻止事件冒泡，防止触发画布平移
        e.stopPropagation();
        
        isDragging = true;
        draggedNodeId = node.id;
        const rect = element.getBoundingClientRect();
        const canvasRect = elements.nodesCanvas.getBoundingClientRect();
        
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        element.style.zIndex = '100';
        element.style.transition = 'none'; // 拖动时禁用过渡动画
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // 阻止事件冒泡，防止触发画布平移
        e.stopPropagation();
        
        const canvasRect = elements.nodesCanvas.getBoundingClientRect();
        
        // 计算节点在画布中的实际位置（考虑画布滚动）
        const x = e.clientX - canvasRect.left - offsetX + elements.nodesCanvas.scrollLeft;
        const y = e.clientY - canvasRect.top - offsetY + elements.nodesCanvas.scrollTop;
        
        // 确保节点位置不为负数
        node.x = Math.max(0, x);
        node.y = Math.max(0, y);
        
        // 直接更新元素位置，不重新渲染整个画布
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
        
        // 只更新与当前节点相关的连接线（不更新分支文本，避免残影）
        updateConnectionsForNode(node.id, false);
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = '1';
            element.style.transition = ''; // 恢复过渡动画
            
            // 拖动结束后，更新连接线和分支文本位置
            updateConnectionsForNode(node.id, true);
            
            // 调整画布大小以适应新位置
            resizeCanvasToFitNodes();
            draggedNodeId = null;
        }
    });
}

// 更新与指定节点相关的连接线（优化版本，只更新连接线，不更新分支文本）
function updateConnectionsForNode(nodeId, updateBranchText = false) {
    if (!elements.nodesCanvas) return;
    
    const node = storyData.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // 删除与当前节点相关的所有连接线和分支文本
    const connectors = elements.nodesCanvas.querySelectorAll(`.node-connector[data-source="${nodeId}"], .node-connector[data-target="${nodeId}"]`);
    connectors.forEach(connector => {
        connector.remove();
        // 同时删除关联的分支文本
        const branchText = elements.nodesCanvas.querySelector(`.branch-text[data-source="${connector.getAttribute('data-source')}"][data-target="${connector.getAttribute('data-target')}"]`);
        if (branchText) {
            branchText.remove();
        }
    });
    
    // 如果updateBranchText为false，只更新连接线位置，不重新绘制分支文本
    if (!updateBranchText) {
        // 只重新绘制连接线（不包含分支文本）
        if (node.branches && node.branches.length > 0) {
            node.branches.forEach(branch => {
                const targetNode = storyData.nodes.find(n => n.id === branch.targetId);
                if (targetNode) {
                    drawConnectionLineOnly(node, targetNode, branch);
                }
            });
        }
        
        // 重新绘制指向当前节点的连接线
        storyData.nodes.forEach(sourceNode => {
            if (sourceNode.branches && sourceNode.branches.length > 0) {
                sourceNode.branches.forEach(branch => {
                    if (branch.targetId === nodeId) {
                        drawConnectionLineOnly(sourceNode, node, branch);
                    }
                });
            }
        });
    } else {
        // 重新绘制完整的连接线和分支文本
        if (node.branches && node.branches.length > 0) {
            node.branches.forEach(branch => {
                const targetNode = storyData.nodes.find(n => n.id === branch.targetId);
                if (targetNode) {
                    drawConnection(node, targetNode, branch);
                }
            });
        }
        
        storyData.nodes.forEach(sourceNode => {
            if (sourceNode.branches && sourceNode.branches.length > 0) {
                sourceNode.branches.forEach(branch => {
                    if (branch.targetId === nodeId) {
                        drawConnection(sourceNode, node, branch);
                    }
                });
            }
        });
    }
}

// 只绘制连接线，不绘制分支文本（用于拖动时实时更新）
function drawConnectionLineOnly(sourceNode, targetNode, branch) {
    const connector = document.createElement('div');
    connector.className = 'node-connector';
    connector.setAttribute('data-source', sourceNode.id);
    connector.setAttribute('data-target', targetNode.id);
    
    // 节点尺寸（与CSS中保持一致）
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 60;
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
    
    // 计算源节点的出口点
    let startX, startY;
    const halfWidth = NODE_WIDTH / 2;
    const halfHeight = NODE_HEIGHT / 2;
    const dx = deltaX / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const dy = deltaY / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (Math.abs(dx) > Math.abs(dy)) {
        startX = sourceCenter.x + halfWidth * Math.sign(dx);
        startY = sourceCenter.y + (halfHeight * dy / Math.abs(dx)) * Math.sign(dy);
    } else {
        startY = sourceCenter.y + halfHeight * Math.sign(dy);
        startX = sourceCenter.x + (halfWidth * dx / Math.abs(dy)) * Math.sign(dx);
    }
    
    // 计算目标节点的入口点
    let endX, endY;
    const targetAngle = angle + Math.PI;
    const targetDx = -deltaX / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const targetDy = -deltaY / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (Math.abs(targetDx) > Math.abs(targetDy)) {
        endX = targetCenter.x + halfWidth * Math.sign(targetDx);
        endY = targetCenter.y + (halfHeight * targetDy / Math.abs(targetDx)) * Math.sign(targetDy);
    } else {
        endY = targetCenter.y + halfHeight * Math.sign(targetDy);
        endX = targetCenter.x + (halfWidth * targetDx / Math.abs(targetDy)) * Math.sign(targetDx);
    }
    
    // 计算线长和角度
    const lineDeltaX = endX - startX;
    const lineDeltaY = endY - startY;
    const length = Math.sqrt(lineDeltaX * lineDeltaX + lineDeltaY * lineDeltaY);
    const lineAngle = Math.atan2(lineDeltaY, lineDeltaX) * 180 / Math.PI;
    
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
    connector.style.pointerEvents = 'none';
    
    elements.nodesCanvas.appendChild(connector);
}

// 绘制连接线
function drawConnection(sourceNode, targetNode, branch) {
    // 调试日志
    console.log(`绘制连接线: 从节点 ${sourceNode.id} 到 ${targetNode.id}`);
    console.log(`源节点坐标: (${sourceNode.x}, ${sourceNode.y})`);
    console.log(`目标节点坐标: (${targetNode.x}, ${targetNode.y})`);
    
    const connector = document.createElement('div');
    connector.className = 'node-connector';
    connector.setAttribute('data-source', sourceNode.id);
    connector.setAttribute('data-target', targetNode.id);
    
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
    
    // 绘制分支文本（添加数据属性以便后续删除）
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    const branchText = document.createElement('div');
    branchText.className = 'branch-text';
    branchText.setAttribute('data-source', sourceNode.id);
    branchText.setAttribute('data-target', targetNode.id);
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
    branchText.textContent = branch.text || '';
    
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
    updateNodePreview();
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
        updateNodePreview();
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
    
    // 清除AI生成的内容
    if (elements.aiGeneratedContent) {
        elements.aiGeneratedContent.value = '';
    }
    if (elements.useAiContentBtn) {
        elements.useAiContentBtn.style.display = 'none';
    }
    if (elements.copyAiContentBtn) {
        elements.copyAiContentBtn.style.display = 'none';
    }
    
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
    updateNodePreview();
    
    // 添加保存成功的视觉反馈
    showNodeEditSuccess('节点保存成功');
}

// AI润色和扩写节点内容
async function polishNodeContentWithAI() {
    // 检查是否有正在编辑的节点
    if (!currentEditingNodeId) {
        showNodeEditError('请先选择要编辑的节点');
        return;
    }
    
    // 检查故事标题和内容
    if (!storyData.title || storyData.title.trim() === '') {
        showNodeEditError('请先填写故事标题');
        return;
    }
    
    const currentContent = elements.nodeEditContent.value.trim();
    if (!currentContent) {
        showNodeEditError('请先输入节点内容');
        return;
    }
    
    // 获取分类名称
    let categoryName = '';
    if (elements.storyCategory && elements.storyCategory.value) {
        const selectedOption = elements.storyCategory.options[elements.storyCategory.selectedIndex];
        if (selectedOption) {
            categoryName = selectedOption.textContent;
        }
    }
    
    // 禁用按钮，显示加载状态
    const originalBtnText = elements.aiPolishBtn.innerHTML;
    elements.aiPolishBtn.disabled = true;
    elements.aiPolishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI处理中...';
    elements.nodeEditError.style.display = 'none';
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            throw new Error('未找到认证令牌，请先登录');
        }
        
        const baseUrl = 'http://localhost:5000/api/v1';
        const response = await fetch(`${baseUrl}/ai/polish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: storyData.title,
                category: categoryName,
                content: currentContent
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'AI服务调用失败' }));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success || !data.data || !data.data.content) {
            throw new Error('AI服务返回数据格式错误');
        }
        
        // 将AI生成的内容填充到AI结果文本框中
        if (elements.aiGeneratedContent) {
            elements.aiGeneratedContent.value = data.data.content;
        }
        
        // 显示使用和复制按钮
        if (elements.useAiContentBtn) {
            elements.useAiContentBtn.style.display = 'flex';
        }
        if (elements.copyAiContentBtn) {
            elements.copyAiContentBtn.style.display = 'flex';
        }
        
        // 显示成功提示
        showNodeEditSuccess('AI润色和扩写完成，内容已生成在下方文本框中');
    } catch (error) {
        console.error('AI润色和扩写失败:', error);
        showNodeEditError('AI润色和扩写失败: ' + error.message);
    } finally {
        // 恢复按钮状态
        elements.aiPolishBtn.disabled = false;
        elements.aiPolishBtn.innerHTML = originalBtnText;
    }
}

// 使用AI生成的内容
function useAiGeneratedContent() {
    if (!elements.aiGeneratedContent || !elements.nodeEditContent) {
        showNodeEditError('元素未找到');
        return;
    }
    
    const aiContent = elements.aiGeneratedContent.value.trim();
    if (!aiContent) {
        showNodeEditError('没有可用的AI生成内容');
        return;
    }
    
    // 将AI生成的内容复制到原始内容框
    elements.nodeEditContent.value = aiContent;
    
    // 显示成功提示
    showNodeEditSuccess('已使用AI生成的内容');
    
    // 自动聚焦到内容框
    elements.nodeEditContent.focus();
    elements.nodeEditContent.setSelectionRange(0, aiContent.length);
}

// 复制AI生成的内容到剪贴板
async function copyAiGeneratedContent() {
    if (!elements.aiGeneratedContent) {
        showNodeEditError('元素未找到');
        return;
    }
    
    const aiContent = elements.aiGeneratedContent.value.trim();
    if (!aiContent) {
        showNodeEditError('没有可用的AI生成内容');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(aiContent);
        showNodeEditSuccess('AI生成的内容已复制到剪贴板');
    } catch (error) {
        console.error('复制失败:', error);
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = aiContent;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNodeEditSuccess('AI生成的内容已复制到剪贴板');
        } catch (err) {
            showNodeEditError('复制失败，请手动复制');
        }
        document.body.removeChild(textArea);
    }
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

// 切换预览面板
function togglePreviewPanel() {
    elements.previewPanel.classList.toggle('hidden');
    elements.previewToggle.innerHTML = elements.previewPanel.classList.contains('hidden') ? 
        '<i class="fas fa-eye"></i> 显示预览' : '<i class="fas fa-eye-slash"></i> 隐藏预览';
}

// 更新节点预览
function updateNodePreview() {
    const currentNode = storyData.nodes.find(n => n.id === storyData.currentNodeId);
    
    if (!currentNode) {
        // 如果没有选中节点，清空预览
        if (elements.nodePreviewTitle) {
            elements.nodePreviewTitle.textContent = '未选择节点';
        }
        if (elements.nodePreviewContent) {
            elements.nodePreviewContent.textContent = '请选择一个节点查看详情';
        }
        return;
    }
    
    // 填充当前节点的信息到预览栏
    if (elements.nodePreviewTitle) {
        elements.nodePreviewTitle.textContent = currentNode.title || '未命名节点';
    }
    if (elements.nodePreviewContent) {
        elements.nodePreviewContent.textContent = currentNode.content || '无内容';
    }
}

// 更新预览内容（此函数已废弃，使用updateNodePreview替代）
function updatePreview() {
    // 此函数已废弃，请使用updateNodePreview()
    // 保留此函数以避免调用错误，直接返回
    return;
}

// 保存故事到数据库
async function saveStory() {
    // 显示保存中状态
    showSaveStatus('保存中...', 'pending');
    
    // 数据验证
    const validationErrors = validateStoryData(storyData);
    if (validationErrors.length > 0) {
        showSaveStatus('保存失败：数据验证错误', 'error');
        showValidationErrors(validationErrors);
        return;
    }
    
    try {
        // 从分类下拉框获取选中的分类ID
        const categorySelect = elements.storyCategory;
        if (!categorySelect) {
            showSaveStatus('保存失败：分类选择框不存在', 'error');
            return;
        }
        
        const categoryId = categorySelect.value;
        if (!categoryId || categoryId.trim() === '') {
            showSaveStatus('保存失败：请选择故事分类', 'error');
            if (elements.categoryError) {
                elements.categoryError.textContent = '请选择故事分类';
                elements.categoryError.style.display = 'block';
            }
            // 聚焦到分类下拉框
            categorySelect.focus();
            return;
        }
        
        // 清除分类错误信息
        if (elements.categoryError) {
            elements.categoryError.textContent = '';
            elements.categoryError.style.display = 'none';
        }
        
        console.log('选中的分类ID:', categoryId);
        
        // 准备保存的数据格式，转换为后端需要的格式
        const saveData = prepareSaveData(storyData, categoryId);
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // 判断是更新还是创建
        const isUpdate = storyData.id && storyData.id !== null && storyData.id !== undefined;
        let apiUrl;
        let method;
        
        if (isUpdate) {
            // 更新现有故事
            apiUrl = window.API_CONFIG ? window.API_CONFIG.STORIES.updateStory(storyData.id) : `http://localhost:5000/api/v1/stories/${storyData.id}`;
            method = 'PUT';
            console.log('更新故事，ID:', storyData.id);
        } else {
            // 创建新故事
            apiUrl = window.API_CONFIG ? window.API_CONFIG.STORIES.createStory() : 'http://localhost:5000/api/v1/stories';
            method = 'POST';
            console.log('创建新故事');
        }
        
        const response = await fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(saveData)
        });
        
        // 检查响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('非JSON响应:', text);
            throw new Error(`服务器返回了非JSON响应 (${response.status}): ${text.substring(0, 100)}`);
        }
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: '保存失败' }));
            // 提取详细错误信息
            const errorMsg = err.message || '保存失败';
            const fieldErrors = err.errors ? err.errors.map(e => e.message).join(', ') : '';
            throw new Error(fieldErrors || errorMsg);
        }
        
        const data = await response.json();
        
        // 如果是创建新故事，更新本地故事ID
        if (!isUpdate && data.data && data.data.id) {
            storyData.id = data.data.id;
        }
        
        // 保存节点和分支（无论是创建还是更新都需要）
        const storyIdToUse = isUpdate ? storyData.id : (data.data?.id || storyData.id);
        if (storyIdToUse) {
            try {
                await saveNodesAndBranches(storyIdToUse);
                const successMessage = isUpdate 
                    ? '保存成功：故事、节点和分支已全部更新' 
                    : '保存成功：故事、节点和分支已全部保存';
                showSaveStatus(successMessage, 'success');
            } catch (error) {
                console.error('保存节点和分支失败:', error);
                // 显示错误信息，但不阻止主流程
                const errorMessage = isUpdate
                    ? '故事已更新，但节点和分支保存失败：' + error.message
                    : '故事已创建，但节点和分支保存失败：' + error.message;
                showSaveStatus(errorMessage, 'error');
            }
        } else {
            showSaveStatus(isUpdate ? '故事更新成功' : '保存成功', 'success');
        }
    } catch (error) {
        console.error('保存失败:', error);
        showSaveStatus('保存失败：' + error.message, 'error');
    }
}

// 加载分类列表到下拉框
async function loadCategories() {
    try {
        const categorySelect = elements.storyCategory;
        if (!categorySelect) {
            console.error('分类下拉框元素不存在');
            return;
        }
        
        const categoriesUrl = 'http://localhost:5000/api/v1/categories';
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        console.log('正在加载分类列表...', { url: categoriesUrl, hasToken: !!token });
        
        const response = await fetch(categoriesUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        });
        
        console.log('分类API响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('分类API请求失败:', response.status, errorText);
            
            // 显示错误信息
            if (elements.categoryError) {
                elements.categoryError.textContent = '加载分类失败，请刷新页面重试';
                elements.categoryError.style.display = 'block';
            }
            return;
        }
        
        const data = await response.json();
        console.log('分类API响应数据:', data);
        
        // 清空现有选项（保留"请选择分类..."选项）
        categorySelect.innerHTML = '<option value="">请选择分类...</option>';
        
        if (data.success && data.data && Array.isArray(data.data)) {
            if (data.data.length > 0) {
                // 添加分类选项到下拉框
                data.data.forEach(category => {
                    const option = document.createElement('option');
                    // Category模型的id字段是数字类型
                    option.value = category.id || category._id || '';
                    option.textContent = category.name || '未命名分类';
                    if (option.value) {
                        categorySelect.appendChild(option);
                    }
                });
                
                console.log(`成功加载 ${data.data.length} 个分类`);
                
                // 清除错误信息
                if (elements.categoryError) {
                    elements.categoryError.textContent = '';
                    elements.categoryError.style.display = 'none';
                }
            } else {
                console.warn('分类列表为空，数据库中没有任何分类');
                if (elements.categoryError) {
                    elements.categoryError.textContent = '数据库中暂无分类，请联系管理员创建分类';
                    elements.categoryError.style.display = 'block';
                }
            }
        } else {
            console.error('分类API响应格式错误:', data);
            if (elements.categoryError) {
                elements.categoryError.textContent = '分类数据格式错误';
                elements.categoryError.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('加载分类列表失败:', error);
        
        // 显示错误信息
        if (elements.categoryError) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                elements.categoryError.textContent = '无法连接到后端服务器，请检查网络连接';
            } else {
                elements.categoryError.textContent = '加载分类失败：' + error.message;
            }
            elements.categoryError.style.display = 'block';
        }
    }
}

// 注意：此函数已不再使用，因为创建分类需要管理员权限
// 如果数据库中没有分类，用户需要先通过管理员界面创建分类

// 加载故事数据用于编辑
async function loadStoryForEditing(storyId) {
    console.log('开始加载故事数据，故事ID:', storyId);
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        throw new Error('未找到认证令牌，请先登录');
    }
    
    const baseUrl = 'http://localhost:5000/api/v1';
    
    try {
        // 1. 加载故事基本信息
        console.log('加载故事基本信息...');
        const storyResponse = await fetch(`${baseUrl}/stories/${storyId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!storyResponse.ok) {
            const errorData = await storyResponse.json().catch(() => ({ message: '获取故事详情失败' }));
            throw new Error(errorData.message || `HTTP ${storyResponse.status}`);
        }
        
        const storyData_response = await storyResponse.json();
        if (!storyData_response.success || !storyData_response.data) {
            throw new Error('故事数据格式错误');
        }
        
        const storyInfo = storyData_response.data;
        console.log('故事基本信息加载成功:', storyInfo);
        
        // 2. 加载节点列表
        console.log('加载节点列表...');
        const nodesResponse = await fetch(`${baseUrl}/storyNodes/stories/${storyId}/nodes`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!nodesResponse.ok) {
            const errorData = await nodesResponse.json().catch(() => ({ message: '获取节点列表失败' }));
            throw new Error(errorData.message || `HTTP ${nodesResponse.status}`);
        }
        
        const nodesData_response = await nodesResponse.json();
        if (!nodesData_response.success || !nodesData_response.data) {
            throw new Error('节点数据格式错误');
        }
        
        const nodes = nodesData_response.data;
        console.log('节点列表加载成功，节点数量:', nodes.length);
        
        // 3. 加载分支列表
        console.log('加载分支列表...');
        const branchesResponse = await fetch(`${baseUrl}/branches/stories/${storyId}/branches`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!branchesResponse.ok) {
            const errorData = await branchesResponse.json().catch(() => ({ message: '获取分支列表失败' }));
            throw new Error(errorData.message || `HTTP ${branchesResponse.status}`);
        }
        
        const branchesData_response = await branchesResponse.json();
        if (!branchesData_response.success || !branchesData_response.data) {
            throw new Error('分支数据格式错误');
        }
        
        const branches = branchesData_response.data;
        console.log('分支列表加载成功，分支数量:', branches.length);
        
        // 4. 将数据填充到storyData
        storyData.id = storyInfo.id;
        storyData.title = storyInfo.title || '';
        storyData.description = storyInfo.description || '';
        storyData.coverImage = storyInfo.coverImage || null;
        
        // 设置分类（确保分类列表已加载）
        if (elements.storyCategory && storyInfo.categoryId) {
            // 等待一小段时间确保分类选项已加载
            await new Promise(resolve => setTimeout(resolve, 100));
            const categoryIdStr = String(storyInfo.categoryId);
            console.log('设置分类ID:', categoryIdStr, '分类下拉框选项数量:', elements.storyCategory.options.length);
            
            // 检查分类选项是否存在
            const categoryOption = Array.from(elements.storyCategory.options).find(opt => opt.value === categoryIdStr);
            if (categoryOption) {
                elements.storyCategory.value = categoryIdStr;
                console.log('分类设置成功:', categoryOption.textContent);
            } else {
                console.warn('分类ID不存在于下拉列表中:', categoryIdStr, '可用选项:', Array.from(elements.storyCategory.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            }
        }
        
        // 设置封面图片预览
        if (storyInfo.coverImage && elements.coverPreview) {
            const coverImageUrl = storyInfo.coverImage.startsWith('http') 
                ? storyInfo.coverImage 
                : `http://localhost:5000${storyInfo.coverImage}`;
            elements.coverPreview.innerHTML = `<img src="${coverImageUrl}" alt="封面预览">`;
            elements.coverPreview.style.display = 'block';
        }
        
        // 5. 转换节点数据格式（从后端格式转换为前端格式）
        storyData.nodes = nodes.map(node => {
            // 找到该节点的所有出向分支
            const nodeBranches = branches.filter(branch => branch.source_node_id === node.id);
            
            // 将分支转换为前端格式
            const nodeBranchesFormatted = nodeBranches.map(branch => ({
                id: branch.id,
                text: branch.context || '继续',
                targetId: branch.target_node_id
            }));
            
            // 确保位置信息是数字类型，且正确读取
            const nodeX = (typeof node.x === 'number' && !isNaN(node.x)) ? node.x : (node.x === null || node.x === undefined ? 0 : parseInt(node.x) || 0);
            const nodeY = (typeof node.y === 'number' && !isNaN(node.y)) ? node.y : (node.y === null || node.y === undefined ? 0 : parseInt(node.y) || 0);
            
            return {
                id: node.id, // 使用数据库中的ID
                title: node.title || '未命名节点',
                content: node.content || '',
                type: node.type || 'regular',
                x: nodeX,
                y: nodeY,
                isRoot: node.is_root === 1 || node.is_root === true || node.isRoot === true,
                branches: nodeBranchesFormatted
            };
        });
        
        console.log('数据转换完成，节点数量:', storyData.nodes.length);
        console.log('转换后的节点位置信息:', storyData.nodes.map(node => ({
            id: node.id,
            title: node.title,
            x: node.x,
            y: node.y
        })));
        
        // 6. 更新表单字段
        console.log('更新表单字段，标题:', storyData.title, '描述:', storyData.description);
        if (elements.storyTitle) {
            elements.storyTitle.value = storyData.title || '';
            console.log('故事标题已设置:', elements.storyTitle.value);
        } else {
            console.error('storyTitle元素不存在');
        }
        if (elements.storyDescription) {
            elements.storyDescription.value = storyData.description || '';
            console.log('故事描述已设置:', elements.storyDescription.value);
        } else {
            console.error('storyDescription元素不存在');
        }
        
        // 7. 如果有节点，选中第一个节点（或根节点）并更新预览
        console.log('节点数量:', storyData.nodes.length);
        if (storyData.nodes.length > 0) {
            // 优先选择根节点
            const rootNode = storyData.nodes.find(n => n.isRoot);
            if (rootNode) {
                storyData.currentNodeId = rootNode.id;
                console.log('选中根节点:', rootNode.id, rootNode.title);
            } else {
                storyData.currentNodeId = storyData.nodes[0].id;
                console.log('选中第一个节点:', storyData.nodes[0].id, storyData.nodes[0].title);
            }
            updateNodePreview();
        } else {
            console.warn('没有节点数据');
        }
        
        console.log('故事数据加载完成，标题:', storyData.title, '节点数:', storyData.nodes.length);
        showSaveStatus('故事数据加载成功', 'success');
        setTimeout(() => {
            const statusIndicator = document.querySelector('.save-status-indicator');
            if (statusIndicator) {
                statusIndicator.style.opacity = '0';
                setTimeout(() => statusIndicator.remove(), 300);
            }
        }, 2000);
        
    } catch (error) {
        console.error('加载故事数据失败:', error);
        throw error;
    }
}

// 准备保存到后端的数据格式
function prepareSaveData(storyData, categoryId) {
    // 转换为后端需要的格式（只发送后端API需要的字段）
    // 确保categoryId是数字类型
    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) {
        throw new Error('无效的分类ID');
    }
    
    const saveData = {
        title: storyData.title,
        description: storyData.description,
        categoryId: categoryIdNum,  // 确保是数字类型
        coverImage: storyData.coverImage || undefined  // 后端使用coverImage，不是cover_image
    };
    
    console.log('准备保存的故事数据:', saveData);
    
    // 注意：后端会自动创建根节点，不需要在这里发送nodes/branches/characters
    // 这些数据应该在创建故事后通过其他API单独保存
    
    return saveData;
}

// 保存节点和分支到数据库
async function saveNodesAndBranches(storyId) {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            console.error('未找到认证令牌');
            throw new Error('未找到认证令牌，请先登录');
        }
        
        // 准备节点数据（包含分支信息）
        const nodesData = storyData.nodes.map(node => {
            // 确保位置信息是数字类型，且不为 undefined 或 null
            const nodeX = (typeof node.x === 'number' && !isNaN(node.x)) ? node.x : 0;
            const nodeY = (typeof node.y === 'number' && !isNaN(node.y)) ? node.y : 0;
            
            return {
                id: node.id, // 前端临时ID，后端会生成新ID
                title: node.title,
                content: node.content,
                type: node.type || 'regular',
                x: nodeX,
                y: nodeY,
                isRoot: node.isRoot || false,
                branches: (node.branches || []).map(branch => ({
                    text: branch.text,
                    targetId: branch.targetId // 确保使用 targetId 字段
                }))
            };
        });
        
        // 调试信息：检查节点位置
        console.log('准备保存的节点位置信息:', nodesData.map(node => ({
            id: node.id,
            title: node.title,
            x: node.x,
            y: node.y
        })));
        
        // 验证数据完整性
        const totalBranches = nodesData.reduce((sum, node) => sum + (node.branches?.length || 0), 0);
        console.log('准备保存节点和分支:', {
            storyId,
            nodeCount: nodesData.length,
            totalBranches: totalBranches,
            nodes: nodesData.map(node => ({
                id: node.id,
                title: node.title,
                branchCount: node.branches?.length || 0,
                branches: node.branches
            }))
        });
        
        // 调用批量保存节点API（会自动处理分支）
        const apiUrl = window.API_CONFIG ? window.API_CONFIG.NODES.batchSave(storyId) : `http://localhost:5000/api/v1/storyNodes/stories/${storyId}/nodes/batch`;
        
        console.log('发送批量保存请求:', {
            url: apiUrl,
            storyId: storyId,
            nodeCount: nodesData.length
        });
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nodes: nodesData })
        });
        
        console.log('批量保存响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                const text = await response.text();
                console.error('批量保存失败响应内容:', text);
                errorData = JSON.parse(text);
            } catch (e) {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            const errorMessage = errorData.message || errorData.error || `保存节点和分支失败 (HTTP ${response.status})`;
            console.error('保存节点和分支失败:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                message: errorMessage
            });
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('节点和分支保存成功:', result);
        
        // 显示保存成功的详细信息
        if (result.data) {
            const savedCount = result.data.nodes?.length || 0;
            const branchesCreated = result.data.branchesCreated || 0;
            console.log(`成功保存 ${savedCount} 个节点和 ${branchesCreated} 个分支`);
        }
        
        return result;
    } catch (error) {
        console.error('保存节点和分支失败:', error);
        // 重新抛出错误，让调用者知道保存失败
        throw error;
    }
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
