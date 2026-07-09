const fs = require('fs');
const os = require('os');
const path = require('path');
const PDFDocument = require('pdfkit');
const Epub = require('epub-gen');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFilename(value) {
  return String(value || 'story')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'story';
}

function getFontPath() {
  const candidates = [
    path.join(process.cwd(), 'assets', 'fonts', 'NotoSansSC-Regular.otf'),
    'C:\\Windows\\Fonts\\msyh.ttc',
    'C:\\Windows\\Fonts\\simhei.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc'
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function normalizeNode(node) {
  return {
    id: node.id,
    title: node.title || 'Untitled node',
    content: node.content || '',
    type: node.type || 'regular',
    isRoot: node.is_root === 1 || node.is_root === true || node.isRoot === true
  };
}

function buildExportData({ story, author, nodes = [], branches = [] }) {
  const normalizedNodes = nodes.map(normalizeNode);
  const byId = new Map(normalizedNodes.map((node) => [String(node.id), node]));
  const root = normalizedNodes.find((node) => node.isRoot) || normalizedNodes[0] || null;
  const visited = new Set();
  const ordered = [];

  function visit(node) {
    if (!node || visited.has(String(node.id))) return;
    visited.add(String(node.id));
    ordered.push(node);
    const outgoing = branches.filter((branch) => String(branch.source_node_id) === String(node.id));
    outgoing.forEach((branch) => visit(byId.get(String(branch.target_node_id))));
  }

  visit(root);
  normalizedNodes.forEach((node) => visit(node));

  const branchNotes = branches.map((branch) => {
    const from = byId.get(String(branch.source_node_id));
    const to = byId.get(String(branch.target_node_id));
    return {
      from: from?.title || branch.source_node_id,
      to: to?.title || branch.target_node_id,
      text: branch.context || 'Continue'
    };
  });

  return {
    title: story.title || 'Untitled story',
    description: story.description || '',
    authorName: author?.username || author?.name || `Author #${story.author_id || ''}`.trim() || 'Unknown author',
    nodes: ordered,
    branchNotes
  };
}

function writePdfExport(exportData, res) {
  const filename = `${sanitizeFilename(exportData.title)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
  const fontPath = getFontPath();
  if (fontPath) {
    doc.registerFont('StoryFont', fontPath);
    doc.font('StoryFont');
  }

  doc.pipe(res);
  doc.fontSize(24).text(exportData.title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#475569').text(`Author: ${exportData.authorName}`, { align: 'center' });
  if (exportData.description) {
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#334155').text(exportData.description, { align: 'left' });
  }

  exportData.nodes.forEach((node, index) => {
    doc.addPage();
    doc.fillColor('#111827').fontSize(18).text(`${index + 1}. ${node.title}`);
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#64748b').text(`Node ID: ${node.id} | Type: ${node.type}`);
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#111827').text(node.content || '(No content)', {
      align: 'left',
      lineGap: 4
    });
  });

  if (exportData.branchNotes.length) {
    doc.addPage();
    doc.fillColor('#111827').fontSize(18).text('Branch Appendix');
    doc.moveDown(1);
    exportData.branchNotes.forEach((branch, index) => {
      doc.fontSize(12).fillColor('#111827').text(`${index + 1}. ${branch.from} -> ${branch.to}`);
      doc.fontSize(10).fillColor('#475569').text(`Choice: ${branch.text}`);
      doc.moveDown(0.8);
    });
  }

  doc.end();
}

async function writeEpubExport(exportData, res) {
  const filename = `${sanitizeFilename(exportData.title)}.epub`;
  const output = path.join(os.tmpdir(), `${Date.now()}-${filename}`);
  const content = exportData.nodes.map((node, index) => ({
    title: `${index + 1}. ${node.title}`,
    data: `<h1>${escapeHtml(node.title)}</h1><p><small>Node ID: ${escapeHtml(node.id)} | Type: ${escapeHtml(node.type)}</small></p>${escapeHtml(node.content || '(No content)').split('\n').map((line) => `<p>${line}</p>`).join('')}`
  }));

  if (exportData.branchNotes.length) {
    content.push({
      title: 'Branch Appendix',
      data: `<h1>Branch Appendix</h1><ol>${exportData.branchNotes.map((branch) => `<li><strong>${escapeHtml(branch.from)}</strong> &rarr; <strong>${escapeHtml(branch.to)}</strong><br><em>${escapeHtml(branch.text)}</em></li>`).join('')}</ol>`
    });
  }

  const options = {
    title: exportData.title,
    author: exportData.authorName,
    publisher: 'StoryForge',
    description: exportData.description,
    content
  };

  await new Epub(options, output).promise;
  res.setHeader('Content-Type', 'application/epub+zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(output);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
  fs.promises.unlink(output).catch(() => {});
}

module.exports = {
  buildExportData,
  writePdfExport,
  writeEpubExport,
  sanitizeFilename
};
