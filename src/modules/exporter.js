/**
 * 卡片导出：把诊断卡片无损导出为 PNG。
 */
import { toPng } from 'html-to-image';

/**
 * 把传入的卡片元素导出为 PNG。
 *
 * 直接对页面上可见的卡片截图即可：html-to-image 内部会自行深拷贝节点、生成
 * SVG 快照，不会改动原节点。
 *
 * 注意：不要把节点复制到屏幕外（position:absolute; top:-9999px）再传进来——
 * 这些定位会被一并写进快照，让卡片落在画布之外，导出一张空白图。
 *
 * @param {HTMLElement} card 待导出的卡片元素
 */
export async function exportCard(card) {
  const dataUrl = await toPng(card, { pixelRatio: 2 });

  const link = document.createElement('a');
  link.download = `CRUSH_DIAGNOSIS_REPORT_${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}
